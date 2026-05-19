package com.comnet360.usagesla.service;

import com.comnet360.usagesla.dto.request.RecordUsageRequest;
import com.comnet360.usagesla.dto.response.UsageRecordResponse;
import com.comnet360.usagesla.entity.UsageRecord;
import com.comnet360.usagesla.enums.MetricType;
import com.comnet360.usagesla.exception.ResourceNotFoundException;
import com.comnet360.usagesla.repository.UsageRecordRepository;
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
public class UsageService {

    private final UsageRecordRepository usageRecordRepository;

    // ── Record Usage ─────────────────────────────────────────────

    @Transactional
    public UsageRecordResponse recordUsage(RecordUsageRequest request,
                                           Long userId) {
        UsageRecord record = UsageRecord.builder()
                .serviceId(request.getServiceId())
                .userId(userId)
                .metricType(request.getMetricType())
                .value(request.getValue())
                .unit(request.getUnit())
                .recordedAt(request.getRecordedAt() != null
                        ? request.getRecordedAt()
                        : LocalDateTime.now())
                .build();

        record = usageRecordRepository.save(record);
        log.debug("Usage recorded: serviceId={} metric={} value={}",
                request.getServiceId(), request.getMetricType(), request.getValue());
        return toResponse(record);
    }

    // ── Queries ───────────────────────────────────────────────────

    public List<UsageRecordResponse> getUsageByService(Long serviceId) {
        return usageRecordRepository
                .findByServiceIdOrderByRecordedAtDesc(serviceId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<UsageRecordResponse> getUsageByUser(Long userId) {
        return usageRecordRepository
                .findByUserIdOrderByRecordedAtDesc(userId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<UsageRecordResponse> getUsageByServiceAndMetric(
            Long serviceId, MetricType metricType) {
        return usageRecordRepository
                .findByServiceIdAndMetricType(serviceId, metricType)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<UsageRecordResponse> getUsageByServiceAndDateRange(
            Long serviceId, LocalDateTime from, LocalDateTime to) {
        return usageRecordRepository
                .findByServiceIdAndRecordedAtBetween(serviceId, from, to)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    public UsageRecordResponse getUsageById(Long usageId) {
        UsageRecord record = usageRecordRepository.findById(usageId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usage record not found with id: " + usageId));
        return toResponse(record);
    }

    // ── Helper ────────────────────────────────────────────────────

    public UsageRecordResponse toResponse(UsageRecord record) {
        return UsageRecordResponse.builder()
                .usageId(record.getUsageId())
                .serviceId(record.getServiceId())
                .userId(record.getUserId())
                .metricType(record.getMetricType())
                .value(record.getValue())
                .unit(record.getUnit())
                .recordedAt(record.getRecordedAt())
                .build();
    }
}