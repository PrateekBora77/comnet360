package com.comnet360.usagesla.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sla_breach_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SlaBreachEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "breach_id")
    private Long breachId;

    @Column(name = "sla_id", nullable = false)
    private Long slaId;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(name = "actual_value", nullable = false, precision = 15, scale = 4)
    private BigDecimal actualValue;

    @Column(name = "threshold_value", nullable = false, precision = 15, scale = 4)
    private BigDecimal thresholdValue;

    @Column(name = "breach_time", nullable = false, updatable = false)
    private LocalDateTime breachTime;

    @Column(name = "resolved", nullable = false)
    @Builder.Default
    private Boolean resolved = false;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        breachTime = LocalDateTime.now();
    }
}