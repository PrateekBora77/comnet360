package com.comnet360.provisioning.repository;

import com.comnet360.provisioning.entity.Service;
import com.comnet360.provisioning.enums.ServiceStatus;
import com.comnet360.provisioning.enums.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long> {

    List<Service> findByStatus(ServiceStatus status);

    List<Service> findByType(ServiceType type);

    List<Service> findByOwnerUserId(Long ownerUserId);

    List<Service> findByStatusAndType(ServiceStatus status, ServiceType type);

    boolean existsByNameAndOwnerUserId(String name, Long ownerUserId);
}