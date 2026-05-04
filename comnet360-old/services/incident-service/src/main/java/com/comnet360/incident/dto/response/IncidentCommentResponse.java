package com.comnet360.incident.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentCommentResponse {

    private Long commentId;
    private Long incidentId;
    private Long authorId;
    private String comment;
    private LocalDateTime createdAt;
}