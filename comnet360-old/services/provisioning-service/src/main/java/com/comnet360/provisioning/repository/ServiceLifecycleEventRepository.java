package com.comnet360.provisioning.repository;

import com.comnet360.provisioning.entity.ServiceLifecycleEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceLifecycleEventRepository
        extends JpaRepository<ServiceLifecycleEvent, Long> {

    List<ServiceLifecycleEvent> findByServiceIdOrderByEventTimeDesc(Long serviceId);
}