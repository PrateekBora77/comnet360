package com.comnet360.analytics.repository;

import com.comnet360.analytics.entity.DashboardSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DashboardSnapshotRepository
        extends JpaRepository<DashboardSnapshot, Long> {

    // Always fetch the most recent snapshot for a given type
    Optional<DashboardSnapshot> findFirstBySnapshotTypeOrderByCapturedAtDesc(
            String snapshotType);
}