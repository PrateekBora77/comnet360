package com.comnet360.usagesla.scheduler;

import com.comnet360.usagesla.entity.SlaBreachEvent;
import com.comnet360.usagesla.entity.SlaDefinition;
import com.comnet360.usagesla.enums.MetricType;
import com.comnet360.usagesla.enums.SlaStatus;
import com.comnet360.usagesla.repository.SlaBreachEventRepository;
import com.comnet360.usagesla.repository.SlaDefinitionRepository;
import com.comnet360.usagesla.repository.UsageRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SlaScheduler {

    private final SlaDefinitionRepository  slaDefinitionRepository;
    private final UsageRecordRepository    usageRecordRepository;
    private final SlaBreachEventRepository slaBreachEventRepository;

    @Scheduled(fixedRate = 60000, initialDelay = 10000)
    @Transactional
    public void evaluateAllSlas() {
        log.info("SLA evaluation job started at {}", LocalDateTime.now());

        List<SlaDefinition> activeSlas =
                slaDefinitionRepository.findByStatus(SlaStatus.ACTIVE);

        if (activeSlas.isEmpty()) {
            log.info("No active SLAs to evaluate");
            return;
        }

        int breachCount    = 0;
        int skippedCount   = 0;
        int recoveredCount = 0;

        for (SlaDefinition sla : activeSlas) {
            try {
                int result = evaluateSla(sla);
                if (result == 1)  breachCount++;
                if (result == 0)  skippedCount++;
                if (result == -1) recoveredCount++;
            } catch (Exception e) {
                log.error("Error evaluating SLA id={}: {}",
                        sla.getSlaId(), e.getMessage(), e);
            }
        }

        log.info("SLA evaluation complete — Evaluated: {} | New breaches: {} " +
                        "| Already breaching (skipped): {} | Recovered: {}",
                activeSlas.size(), breachCount, skippedCount, recoveredCount);
    }

    // Returns:
    //  1  = new breach detected and saved
    //  0  = breach already exists (skipped — no duplicate saved)
    // -1  = was breaching before, now recovered (unresolved breach auto-resolved)
    // -2  = no breach and no prior unresolved breach (healthy)
    private int evaluateSla(SlaDefinition sla) {

        LocalDateTime windowStart = LocalDateTime.now().minusHours(24);
        BigDecimal actualValue;

        try {
            MetricType metricType = MetricType.valueOf(
                    sla.getMetric().toUpperCase().trim());

            actualValue = usageRecordRepository
                    .sumValueByServiceAndMetricSince(
                            sla.getServiceId(), metricType, windowStart);

            log.info("SLA eval → slaId={} serviceId={} metric={} " +
                            "actual={} threshold={} operator={}",
                    sla.getSlaId(), sla.getServiceId(),
                    sla.getMetric(), actualValue,
                    sla.getThreshold(), sla.getOperator());

        } catch (IllegalArgumentException e) {
            log.warn("Unknown metric '{}' for SLA id={} — skipping",
                    sla.getMetric(), sla.getSlaId());
            return -2;
        }

        boolean currentlyBreaching = isBreached(
                actualValue, sla.getThreshold(), sla.getOperator().name());

        // Check if there is already an open (unresolved) breach for this SLA
        List<SlaBreachEvent> openBreaches =
                slaBreachEventRepository.findBySlaIdAndResolvedFalse(sla.getSlaId());

        boolean hasOpenBreach = !openBreaches.isEmpty();

        if (currentlyBreaching && hasOpenBreach) {
            // Breach ongoing — already recorded, do not create a duplicate
            log.warn("SLA still breaching (open breach exists) — " +
                            "slaId={} actual={} threshold={}",
                    sla.getSlaId(), actualValue, sla.getThreshold());
            return 0;
        }

        if (currentlyBreaching && !hasOpenBreach) {
            // New breach — save it
            log.warn("*** NEW SLA BREACH! slaId={} serviceId={} metric={} " +
                            "actual={} threshold={} operator={}",
                    sla.getSlaId(), sla.getServiceId(),
                    sla.getMetric(), actualValue,
                    sla.getThreshold(), sla.getOperator());

            SlaBreachEvent breach = SlaBreachEvent.builder()
                    .slaId(sla.getSlaId())
                    .serviceId(sla.getServiceId())
                    .actualValue(actualValue)
                    .thresholdValue(sla.getThreshold())
                    .resolved(false)
                    .build();

            slaBreachEventRepository.save(breach);
            return 1;
        }

        if (!currentlyBreaching && hasOpenBreach) {
            // Was breaching before but metric is now within threshold
            // Auto-resolve the open breach event
            log.info("SLA recovered — auto-resolving open breach. " +
                            "slaId={} actual={} threshold={}",
                    sla.getSlaId(), actualValue, sla.getThreshold());

            openBreaches.forEach(b -> {
                b.setResolved(true);
                b.setResolvedAt(LocalDateTime.now());
                slaBreachEventRepository.save(b);
            });
            return -1;
        }

        // Not breaching and no open breach — service is healthy
        log.info("SLA healthy — slaId={} actual={} threshold={}",
                sla.getSlaId(), actualValue, sla.getThreshold());
        return -2;
    }

    private boolean isBreached(BigDecimal actual, BigDecimal threshold,
                               String operator) {
        int cmp = actual.compareTo(threshold);
        return switch (operator) {
            case "LESS_THAN"             -> cmp >= 0;
            case "GREATER_THAN"          -> cmp <= 0;
            case "EQUAL_TO"              -> cmp != 0;
            case "LESS_THAN_OR_EQUAL"    -> cmp > 0;
            case "GREATER_THAN_OR_EQUAL" -> cmp < 0;
            default -> false;
        };
    }
}