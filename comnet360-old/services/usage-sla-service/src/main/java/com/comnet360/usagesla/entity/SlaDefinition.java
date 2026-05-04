package com.comnet360.usagesla.entity;

import com.comnet360.usagesla.enums.SlaOperator;
import com.comnet360.usagesla.enums.SlaStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sla_definitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SlaDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sla_id")
    private Long slaId;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(name = "metric", nullable = false, length = 100)
    private String metric;

    @Column(name = "threshold", nullable = false, precision = 15, scale = 4)
    private BigDecimal threshold;

    @Column(name = "unit", nullable = false, length = 30)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(name = "operator", nullable = false)
    @Builder.Default
    private SlaOperator operator = SlaOperator.LESS_THAN;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SlaStatus status = SlaStatus.ACTIVE;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}