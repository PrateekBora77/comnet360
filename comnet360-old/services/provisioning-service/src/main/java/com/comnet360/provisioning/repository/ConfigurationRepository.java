package com.comnet360.provisioning.repository;

import com.comnet360.provisioning.entity.Configuration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConfigurationRepository extends JpaRepository<Configuration, Long> {

    List<Configuration> findByServiceIdOrderByEffectiveDateDesc(Long serviceId);

    List<Configuration> findByServiceIdAndParameter(Long serviceId, String parameter);
}