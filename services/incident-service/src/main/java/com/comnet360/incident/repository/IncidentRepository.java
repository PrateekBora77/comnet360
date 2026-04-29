package com.comnet360.incident.repository;

import com.comnet360.incident.entity.Incident;
import com.comnet360.incident.enums.IncidentSeverity;
import com.comnet360.incident.enums.IncidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    List<Incident> findByStatusOrderByDetectedDateDesc(IncidentStatus status);

    List<Incident> findBySeverityOrderByDetectedDateDesc(IncidentSeverity severity);

    List<Incident> findByServiceIdOrderByDetectedDateDesc(Long serviceId);

    List<Incident> findByAssignedToOrderByDetectedDateDesc(Long assignedTo);

    List<Incident> findByReportedByOrderByDetectedDateDesc(Long reportedBy);

    List<Incident> findByStatusAndSeverityOrderByDetectedDateDesc(
            IncidentStatus status, IncidentSeverity severity);
}