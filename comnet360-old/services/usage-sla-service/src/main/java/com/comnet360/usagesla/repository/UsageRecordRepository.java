package com.comnet360.usagesla.repository;

import com.comnet360.usagesla.entity.UsageRecord;
import com.comnet360.usagesla.enums.MetricType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UsageRecordRepository extends JpaRepository<UsageRecord, Long> {

    List<UsageRecord> findByServiceIdOrderByRecordedAtDesc(Long serviceId);

    List<UsageRecord> findByUserIdOrderByRecordedAtDesc(Long userId);

    List<UsageRecord> findByServiceIdAndMetricType(Long serviceId, MetricType metricType);

    List<UsageRecord> findByServiceIdAndRecordedAtBetween(
            Long serviceId, LocalDateTime from, LocalDateTime to);

    // Sum of a metric for a service within a time window
    // Used by the SLA scheduler to evaluate thresholds
    @Query("SELECT COALESCE(SUM(u.value), 0) FROM UsageRecord u " +
            "WHERE u.serviceId = :serviceId " +
            "AND u.metricType = :metricType " +
            "AND u.recordedAt >= :from")
    BigDecimal sumValueByServiceAndMetricSince(
            Long serviceId, MetricType metricType, LocalDateTime from);

    // Latest value for a metric — used for instantaneous checks
    @Query("SELECT u FROM UsageRecord u " +
            "WHERE u.serviceId = :serviceId " +
            "AND u.metricType = :metricType " +
            "ORDER BY u.recordedAt DESC LIMIT 1")
    UsageRecord findLatestByServiceAndMetric(Long serviceId, MetricType metricType);
}