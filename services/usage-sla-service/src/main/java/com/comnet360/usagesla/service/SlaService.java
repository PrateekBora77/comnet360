package com.comnet360.usagesla.service;

import com.comnet360.usagesla.dto.request.CreateSlaRequest;
import com.comnet360.usagesla.dto.request.PatchSlaRequest;
import com.comnet360.usagesla.dto.response.SlaBreachEventResponse;
import com.comnet360.usagesla.dto.response.SlaDefinitionResponse;
import com.comnet360.usagesla.entity.SlaBreachEvent;
import com.comnet360.usagesla.entity.SlaDefinition;
import com.comnet360.usagesla.enums.SlaStatus;
import com.comnet360.usagesla.exception.BadRequestException;
import com.comnet360.usagesla.exception.ConflictException;
import com.comnet360.usagesla.exception.ResourceNotFoundException;
import com.comnet360.usagesla.repository.SlaBreachEventRepository;
import com.comnet360.usagesla.repository.SlaDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlaService {

    private final SlaDefinitionRepository slaDefinitionRepository;
    private final SlaBreachEventRepository slaBreachEventRepository;

    // ── SLA Definition CRUD ──────────────────────────────────────

    @Transactional
    public SlaDefinitionResponse createSla(CreateSlaRequest request) {
        SlaDefinition sla = SlaDefinition.builder()
                .serviceId(request.getServiceId())
                .metric(request.getMetric().name())
                .threshold(request.getThreshold())
                .unit(request.getUnit())
                .operator(request.getOperator())
                .status(SlaStatus.ACTIVE)
                .description(request.getDescription())
                .build();

        sla = slaDefinitionRepository.save(sla);
        log.info("SLA created: serviceId={} metric={} threshold={}",
                sla.getServiceId(), sla.getMetric(), sla.getThreshold());
        return toSlaResponse(sla);
    }

    public List<SlaDefinitionResponse> getAllSlas() {
        return slaDefinitionRepository.findAll()
                .stream().map(this::toSlaResponse)
                .collect(Collectors.toList());
    }

    public SlaDefinitionResponse getSlaById(Long slaId) {
        return toSlaResponse(findSlaById(slaId));
    }

    public List<SlaDefinitionResponse> getSlasByService(Long serviceId) {
        return slaDefinitionRepository.findByServiceId(serviceId)
                .stream().map(this::toSlaResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SlaDefinitionResponse patchSla(Long slaId, PatchSlaRequest request) {
        SlaDefinition sla = findSlaById(slaId);

        if (request.getThreshold() != null) sla.setThreshold(request.getThreshold());
        if (request.getOperator()  != null) sla.setOperator(request.getOperator());
        if (request.getUnit()      != null) sla.setUnit(request.getUnit());
        if (request.getDescription() != null) sla.setDescription(request.getDescription());

        sla = slaDefinitionRepository.save(sla);
        log.info("SLA {} patched — threshold={} operator={} unit={}",
                slaId, sla.getThreshold(), sla.getOperator(), sla.getUnit());
        return toSlaResponse(sla);
    }

    @Transactional
    public SlaDefinitionResponse updateSlaStatus(Long slaId, SlaStatus status) {
        SlaDefinition sla = findSlaById(slaId);
        sla.setStatus(status);
        sla = slaDefinitionRepository.save(sla);
        log.info("SLA {} status updated to {}", slaId, status);
        return toSlaResponse(sla);
    }

    @Transactional
    public void deleteSla(Long slaId) {
        if (!slaDefinitionRepository.existsById(slaId)) {
            throw new ResourceNotFoundException(
                    "SLA not found with id: " + slaId);
        }
        List<SlaBreachEvent> openBreaches =
                slaBreachEventRepository.findBySlaIdAndResolvedFalse(slaId);
        if (!openBreaches.isEmpty()) {
            throw new ConflictException(
                    "Cannot delete SLA id=" + slaId +
                    ": it has " + openBreaches.size() +
                    " unresolved breach event(s). Resolve them first.");
        }
        slaDefinitionRepository.deleteById(slaId);
        log.info("SLA deleted: id={}", slaId);
    }

    // ── Breach Events ────────────────────────────────────────────

    public List<SlaBreachEventResponse> getAllBreaches() {
        return slaBreachEventRepository.findAll()
                .stream().map(this::toBreachResponse)
                .collect(Collectors.toList());
    }

    public List<SlaBreachEventResponse> getBreachesByService(Long serviceId) {
        return slaBreachEventRepository
                .findByServiceIdOrderByBreachTimeDesc(serviceId)
                .stream().map(this::toBreachResponse)
                .collect(Collectors.toList());
    }

    public List<SlaBreachEventResponse> getUnresolvedBreaches() {
        return slaBreachEventRepository
                .findByResolvedFalseOrderByBreachTimeDesc()
                .stream().map(this::toBreachResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SlaBreachEventResponse resolveBreachEvent(Long breachId) {
        SlaBreachEvent breach = slaBreachEventRepository
                .findById(breachId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Breach event not found with id: " + breachId));
        if (breach.getResolved()) {
            throw new BadRequestException(
                    "Breach event " + breachId + " is already resolved");
        }
        breach.setResolved(true);
        breach.setResolvedAt(LocalDateTime.now());
        breach = slaBreachEventRepository.save(breach);
        log.info("Breach event {} resolved", breachId);
        return toBreachResponse(breach);
    }

    // ── Private Helpers ──────────────────────────────────────────

    private SlaDefinition findSlaById(Long slaId) {
        return slaDefinitionRepository.findById(slaId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "SLA not found with id: " + slaId));
    }

    public SlaDefinitionResponse toSlaResponse(SlaDefinition sla) {
        return SlaDefinitionResponse.builder()
                .slaId(sla.getSlaId())
                .serviceId(sla.getServiceId())
                .metric(sla.getMetric())
                .threshold(sla.getThreshold())
                .unit(sla.getUnit())
                .operator(sla.getOperator())
                .status(sla.getStatus())
                .description(sla.getDescription())
                .createdAt(sla.getCreatedAt())
                .updatedAt(sla.getUpdatedAt())
                .build();
    }

    public SlaBreachEventResponse toBreachResponse(SlaBreachEvent breach) {
        return SlaBreachEventResponse.builder()
                .breachId(breach.getBreachId())
                .slaId(breach.getSlaId())
                .serviceId(breach.getServiceId())
                .actualValue(breach.getActualValue())
                .thresholdValue(breach.getThresholdValue())
                .breachTime(breach.getBreachTime())
                .resolved(breach.getResolved())
                .resolvedAt(breach.getResolvedAt())
                .build();
    }
}