package com.comnet360.usagesla.repository;

import com.comnet360.usagesla.entity.SlaBreachEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SlaBreachEventRepository extends JpaRepository<SlaBreachEvent, Long> {

    List<SlaBreachEvent> findBySlaIdOrderByBreachTimeDesc(Long slaId);

    List<SlaBreachEvent> findByServiceIdOrderByBreachTimeDesc(Long serviceId);

    List<SlaBreachEvent> findByResolvedFalseOrderByBreachTimeDesc();

    List<SlaBreachEvent> findByServiceIdAndResolvedFalse(Long serviceId);

    // Used by scheduler to check if a breach is already open for this SLA
    List<SlaBreachEvent> findBySlaIdAndResolvedFalse(Long slaId);
}