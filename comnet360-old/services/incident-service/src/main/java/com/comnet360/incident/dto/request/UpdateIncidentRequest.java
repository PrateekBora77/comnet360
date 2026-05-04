package com.comnet360.incident.dto.request;

import com.comnet360.incident.enums.IncidentSeverity;
import com.comnet360.incident.enums.IncidentStatus;
import lombok.Data;

@Data
public class UpdateIncidentRequest {

    private String title;
    private String description;
    private IncidentSeverity severity;
    private IncidentStatus status;
    private Long assignedTo;
}