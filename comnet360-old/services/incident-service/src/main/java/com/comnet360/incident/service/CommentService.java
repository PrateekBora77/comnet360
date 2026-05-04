package com.comnet360.incident.service;

import com.comnet360.incident.dto.request.AddCommentRequest;
import com.comnet360.incident.dto.response.IncidentCommentResponse;
import com.comnet360.incident.entity.IncidentComment;
import com.comnet360.incident.exception.ResourceNotFoundException;
import com.comnet360.incident.repository.IncidentCommentRepository;
import com.comnet360.incident.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final IncidentCommentRepository commentRepository;
    private final IncidentRepository        incidentRepository;

    // ── Add Comment ───────────────────────────────────────────────

    @Transactional
    public IncidentCommentResponse addComment(Long incidentId,
                                              AddCommentRequest request,
                                              Long authorId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw new ResourceNotFoundException(
                    "Incident not found with id: " + incidentId);
        }

        IncidentComment comment = IncidentComment.builder()
                .incidentId(incidentId)
                .authorId(authorId)
                .comment(request.getComment())
                .build();

        comment = commentRepository.save(comment);
        log.debug("Comment added to incident {}", incidentId);
        return toResponse(comment);
    }

    // ── Read ──────────────────────────────────────────────────────

    public List<IncidentCommentResponse> getCommentsByIncident(
            Long incidentId) {
        if (!incidentRepository.existsById(incidentId)) {
            throw new ResourceNotFoundException(
                    "Incident not found with id: " + incidentId);
        }
        return commentRepository
                .findByIncidentIdOrderByCreatedAtAsc(incidentId)
                .stream().map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Helper ────────────────────────────────────────────────────

    private IncidentCommentResponse toResponse(IncidentComment comment) {
        return IncidentCommentResponse.builder()
                .commentId(comment.getCommentId())
                .incidentId(comment.getIncidentId())
                .authorId(comment.getAuthorId())
                .comment(comment.getComment())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}