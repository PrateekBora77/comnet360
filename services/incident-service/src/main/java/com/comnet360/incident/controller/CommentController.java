package com.comnet360.incident.controller;

import com.comnet360.incident.dto.request.AddCommentRequest;
import com.comnet360.incident.dto.response.IncidentCommentResponse;
import com.comnet360.incident.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // POST /api/incidents/{incidentId}/comments
    @PostMapping("/{incidentId}/comments")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<IncidentCommentResponse> addComment(
            @PathVariable Long incidentId,
            @Valid @RequestBody AddCommentRequest request,
            @RequestHeader(value = "X-User-Id", required = false)
            Long userId) {
        Long effectiveUserId = userId != null ? userId : 0L;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.addComment(
                        incidentId, request, effectiveUserId));
    }

    // GET /api/incidents/{incidentId}/comments
    @GetMapping("/{incidentId}/comments")
    @PreAuthorize("hasAnyRole('ADMIN','NETWORK_ENGINEER','SERVICE_MANAGER','OPERATIONS_HEAD')")
    public ResponseEntity<List<IncidentCommentResponse>> getComments(
            @PathVariable Long incidentId) {
        return ResponseEntity.ok(
                commentService.getCommentsByIncident(incidentId));
    }
}