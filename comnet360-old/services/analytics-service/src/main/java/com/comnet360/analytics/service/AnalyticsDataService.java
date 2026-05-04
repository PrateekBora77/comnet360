package com.comnet360.analytics.service;

import com.comnet360.analytics.dto.response.IncidentSummaryResponse;
import com.comnet360.analytics.dto.response.SlaComplianceResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Service
public class AnalyticsDataService {

    private final WebClient usageSlaClient;
    private final WebClient incidentClient;
    private final ObjectMapper objectMapper;

    // Internal service identity headers — downstream services trust these
    private static final String INTERNAL_EMAIL = "analytics@comnet360.internal";
    private static final String INTERNAL_ROLE  = "ADMIN";
    private static final String INTERNAL_ID    = "0";

    public AnalyticsDataService(
            @Qualifier("usageSlaClient") WebClient usageSlaClient,
            @Qualifier("incidentClient") WebClient incidentClient,
            ObjectMapper objectMapper) {
        this.usageSlaClient = usageSlaClient;
        this.incidentClient = incidentClient;
        this.objectMapper   = objectMapper;
    }

    // ── SLA Compliance ───────────────────────────────────────────

    @CircuitBreaker(name = "usageSlaService", fallbackMethod = "slaComplianceFallback")
    public SlaComplianceResponse buildSlaCompliance(Long serviceId,
                                                    LocalDate from,
                                                    LocalDate to) {
        try {
            log.debug("Fetching SLA breaches for serviceId={}", serviceId);

            // Fetch all breaches for the service
            String breachesJson = usageSlaClient.get()
                    .uri("/api/sla/breaches/service/" + serviceId)
                    .header("X-User-Email", INTERNAL_EMAIL)
                    .header("X-User-Role",  INTERNAL_ROLE)
                    .header("X-User-Id",    INTERNAL_ID)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            log.debug("Breaches response: {}", breachesJson);

            JsonNode breaches = objectMapper.readTree(breachesJson);
            long total      = 0;
            long resolved   = 0;
            long unresolved = 0;

            LocalDateTime windowStart = (from != null)
                    ? from.atStartOfDay() : LocalDateTime.MIN;
            LocalDateTime windowEnd   = (to != null)
                    ? to.plusDays(1).atStartOfDay() : LocalDateTime.MAX;

            for (JsonNode breach : breaches) {
                String breachTimeStr = breach.path("breachTime").asText(null);
                if (breachTimeStr != null) {
                    try {
                        LocalDateTime breachTime = LocalDateTime.parse(breachTimeStr);
                        if (breachTime.isBefore(windowStart) || !breachTime.isBefore(windowEnd)) {
                            continue;
                        }
                    } catch (Exception ignored) {}
                }
                total++;
                if (breach.path("resolved").asBoolean()) {
                    resolved++;
                } else {
                    unresolved++;
                }
            }

            // Fetch SLA definitions for metric name
            String slasJson = usageSlaClient.get()
                    .uri("/api/sla/service/" + serviceId)
                    .header("X-User-Email", INTERNAL_EMAIL)
                    .header("X-User-Role",  INTERNAL_ROLE)
                    .header("X-User-Id",    INTERNAL_ID)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            log.debug("SLAs response: {}", slasJson);

            JsonNode slas = objectMapper.readTree(slasJson);
            String metric = slas.size() > 0
                    ? slas.get(0).path("metric").asText("N/A")
                    : "N/A";

            double compliance = total == 0 ? 100.0
                    : Math.round(((double) resolved / total) * 10000.0) / 100.0;

            log.info("SLA compliance for serviceId={}: total={} resolved={} unresolved={} compliance={}%",
                    serviceId, total, resolved, unresolved, compliance);

            return SlaComplianceResponse.builder()
                    .serviceId(serviceId)
                    .metric(metric)
                    .totalBreaches(total)
                    .resolvedBreaches(resolved)
                    .unresolvedBreaches(unresolved)
                    .compliancePercentage(compliance)
                    .fromDate(from)
                    .toDate(to)
                    .build();

        } catch (Exception e) {
            log.error("Error fetching SLA data for serviceId={}: {}",
                    serviceId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch SLA data from usage-sla-service", e);
        }
    }

    public SlaComplianceResponse slaComplianceFallback(Long serviceId,
                                                        LocalDate from,
                                                        LocalDate to,
                                                        Exception ex) {
        log.warn("Circuit breaker active for usage-sla-service — returning degraded SLA response. Cause: {}",
                ex.getMessage());
        return SlaComplianceResponse.builder()
                .serviceId(serviceId)
                .metric("UNAVAILABLE")
                .totalBreaches(-1L)
                .resolvedBreaches(-1L)
                .unresolvedBreaches(-1L)
                .compliancePercentage(-1.0)
                .fromDate(from)
                .toDate(to)
                .build();
    }

    // ── Incident Summary ─────────────────────────────────────────

    @CircuitBreaker(name = "incidentService", fallbackMethod = "incidentSummaryFallback")
    public IncidentSummaryResponse buildIncidentSummary(LocalDate from,
                                                        LocalDate to) {
        try {
            log.debug("Fetching all incidents from incident-service");

            String incidentsJson = incidentClient.get()
                    .uri("/api/incidents")
                    .header("X-User-Email", INTERNAL_EMAIL)
                    .header("X-User-Role",  INTERNAL_ROLE)
                    .header("X-User-Id",    INTERNAL_ID)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            log.debug("Incidents response: {}", incidentsJson);

            JsonNode incidents = objectMapper.readTree(incidentsJson);

            long total      = 0;
            long open       = 0, inProgress = 0, resolved = 0, closed = 0;
            long critical   = 0, high = 0, medium = 0, low = 0;
            long mttrTotal  = 0;
            long mttrCount  = 0;

            LocalDateTime incWindowStart = (from != null)
                    ? from.atStartOfDay() : LocalDateTime.MIN;
            LocalDateTime incWindowEnd   = (to != null)
                    ? to.plusDays(1).atStartOfDay() : LocalDateTime.MAX;

            for (JsonNode incident : incidents) {
                String detectedStr = incident.path("detectedDate").asText(null);
                if (detectedStr != null) {
                    try {
                        LocalDateTime detectedDate = LocalDateTime.parse(detectedStr);
                        if (detectedDate.isBefore(incWindowStart) || !detectedDate.isBefore(incWindowEnd)) {
                            continue;
                        }
                    } catch (Exception ignored) {}
                }
                total++;
                String status   = incident.path("status").asText();
                String severity = incident.path("severity").asText();

                switch (status) {
                    case "OPEN"        -> open++;
                    case "IN_PROGRESS" -> inProgress++;
                    case "RESOLVED"    -> resolved++;
                    case "CLOSED"      -> closed++;
                }

                switch (severity) {
                    case "CRITICAL" -> critical++;
                    case "HIGH"     -> high++;
                    case "MEDIUM"   -> medium++;
                    case "LOW"      -> low++;
                }

                // MTTR calculation
                if (!incident.path("resolvedDate").isNull()
                        && !incident.path("detectedDate").isNull()) {
                    try {
                        java.time.LocalDateTime detected = java.time.LocalDateTime.parse(
                                incident.path("detectedDate").asText());
                        java.time.LocalDateTime resolvedDate = java.time.LocalDateTime.parse(
                                incident.path("resolvedDate").asText());
                        long minutes = java.time.Duration.between(
                                detected, resolvedDate).toMinutes();
                        mttrTotal += minutes;
                        mttrCount++;
                    } catch (Exception ignored) {}
                }
            }

            double avgMttr = mttrCount > 0
                    ? Math.round((double) mttrTotal / mttrCount * 100.0) / 100.0
                    : 0.0;

            log.info("Incident summary: total={} open={} inProgress={} " +
                            "resolved={} closed={} critical={}",
                    total, open, inProgress, resolved, closed, critical);

            return IncidentSummaryResponse.builder()
                    .totalIncidents(total)
                    .openIncidents(open)
                    .inProgressIncidents(inProgress)
                    .resolvedIncidents(resolved)
                    .closedIncidents(closed)
                    .criticalIncidents(critical)
                    .highIncidents(high)
                    .mediumIncidents(medium)
                    .lowIncidents(low)
                    .averageMttrMinutes(avgMttr)
                    .fromDate(from)
                    .toDate(to)
                    .build();

        } catch (Exception e) {
            log.error("Error fetching incident data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch incident data from incident-service", e);
        }
    }

    public IncidentSummaryResponse incidentSummaryFallback(LocalDate from,
                                                            LocalDate to,
                                                            Exception ex) {
        log.warn("Circuit breaker active for incident-service — returning degraded incident response. Cause: {}",
                ex.getMessage());
        return IncidentSummaryResponse.builder()
                .totalIncidents(-1L)
                .openIncidents(-1L)
                .inProgressIncidents(-1L)
                .resolvedIncidents(-1L)
                .closedIncidents(-1L)
                .criticalIncidents(-1L)
                .highIncidents(-1L)
                .mediumIncidents(-1L)
                .lowIncidents(-1L)
                .averageMttrMinutes(-1.0)
                .fromDate(from)
                .toDate(to)
                .build();
    }
}