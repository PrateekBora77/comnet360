package com.comnet360.analytics.entity;

import com.comnet360.analytics.enums.ReportType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "kpi_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "scope", nullable = false, length = 150)
    private String scope;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false)
    private ReportType reportType;

    // JSON blob — stores the actual report data
    @Column(name = "metrics", nullable = false, columnDefinition = "JSON")
    private String metrics;

    @Column(name = "from_date", nullable = false)
    private LocalDate fromDate;

    @Column(name = "to_date", nullable = false)
    private LocalDate toDate;

    @Column(name = "generated_by", nullable = false)
    private Long generatedBy;

    @Column(name = "generated_date", nullable = false, updatable = false)
    private LocalDateTime generatedDate;

    @PrePersist
    protected void onCreate() {
        generatedDate = LocalDateTime.now();
    }
}