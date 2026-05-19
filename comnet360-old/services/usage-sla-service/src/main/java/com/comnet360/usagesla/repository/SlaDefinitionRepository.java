package com.comnet360.usagesla.repository;

import com.comnet360.usagesla.entity.SlaDefinition;
import com.comnet360.usagesla.enums.SlaStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SlaDefinitionRepository extends JpaRepository<SlaDefinition, Long> {

    List<SlaDefinition> findByServiceId(Long serviceId);

    List<SlaDefinition> findByStatus(SlaStatus status);

    // Used by scheduler — only evaluates active SLAs
    List<SlaDefinition> findByServiceIdAndStatus(Long serviceId, SlaStatus status);
}