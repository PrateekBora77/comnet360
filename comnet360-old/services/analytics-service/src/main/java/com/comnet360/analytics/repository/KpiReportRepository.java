package com.comnet360.analytics.repository;

import com.comnet360.analytics.entity.KpiReport;
import com.comnet360.analytics.enums.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface KpiReportRepository extends JpaRepository<KpiReport, Long> {

    List<KpiReport> findByReportTypeOrderByGeneratedDateDesc(ReportType reportType);

    List<KpiReport> findByGeneratedByOrderByGeneratedDateDesc(Long generatedBy);

    List<KpiReport> findByFromDateGreaterThanEqualAndToDateLessThanEqualOrderByGeneratedDateDesc(
            LocalDate fromDate, LocalDate toDate);
}