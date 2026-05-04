package com.comnet360.incident.dto.response;

import com.comnet360.incident.enums.ActionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolutionActionResponse {

    private Long actionId;
    private Long incidentId;
    private Long ownerId;
    private String actionDescription;
    private LocalDateTime dueDate;
    private ActionStatus status;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}