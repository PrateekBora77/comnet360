package com.comnet360.incident.entity;

import com.comnet360.incident.enums.IncidentSeverity;
import com.comnet360.incident.enums.IncidentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    @Builder.Default
    private IncidentSeverity severity = IncidentSeverity.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private IncidentStatus status = IncidentStatus.OPEN;

    @Column(name = "detected_date", nullable = false, updatable = false)
    private LocalDateTime detectedDate;

    @Column(name = "resolved_date")
    private LocalDateTime resolvedDate;

    @Column(name = "reported_by", nullable = false)
    private Long reportedBy;

    @Column(name = "assigned_to")
    private Long assignedTo;

    @PrePersist
    protected void onCreate() {
        detectedDate = LocalDateTime.now();
    }
}