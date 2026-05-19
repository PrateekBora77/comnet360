package com.comnet360.iam.service;

import com.comnet360.iam.entity.AuditLog;
import com.comnet360.iam.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    // Called from AuthService and UserService after every important action
    public void log(Long userId, String action,
                    String entityType, String entityId,
                    String details, String ipAddress) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .build();

        auditLogRepository.save(auditLog);
        log.debug("Audit log saved: userId={} action={}", userId, action);
    }

    // Shortcut — when no entity context is needed (e.g. login)
    public void log(Long userId, String action, String ipAddress) {
        log(userId, action, null, null, null, ipAddress);
    }

    public List<AuditLog> getLogsForUser(Long userId) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll();
    }

    public List<AuditLog> getLogsByDateRange(LocalDateTime from, LocalDateTime to) {
        return auditLogRepository.findByTimestampBetweenOrderByTimestampDesc(from, to);
    }
}