package com.comnet360.incident.dto.response;

import com.comnet360.incident.enums.IncidentSeverity;
import com.comnet360.incident.enums.IncidentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentResponse {

    private Long incidentId;
    private Long serviceId;
    private String title;
    private String description;
    private IncidentSeverity severity;
    private IncidentStatus status;
    private LocalDateTime detectedDate;
    private LocalDateTime resolvedDate;
    private Long reportedBy;
    private Long assignedTo;
}