package com.comnet360.incident.repository;

import com.comnet360.incident.entity.ResolutionAction;
import com.comnet360.incident.enums.ActionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResolutionActionRepository
        extends JpaRepository<ResolutionAction, Long> {

    List<ResolutionAction> findByIncidentIdOrderByCreatedAtDesc(Long incidentId);

    List<ResolutionAction> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<ResolutionAction> findByStatus(ActionStatus status);

    List<ResolutionAction> findByIncidentIdAndStatus(
            Long incidentId, ActionStatus status);
}