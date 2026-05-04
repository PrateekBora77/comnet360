package com.comnet360.iam.service;

import com.comnet360.iam.dto.request.UpdateProfileRequest;
import com.comnet360.iam.dto.request.UpdateRoleRequest;
import com.comnet360.iam.dto.response.UserResponse;
import com.comnet360.iam.entity.User;
import com.comnet360.iam.exception.ResourceNotFoundException;
import com.comnet360.iam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository  userRepository;
    private final AuditLogService auditLogService;

    // ── Queries ───────────────────────────────────────────────────

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public UserResponse getUserById(Long userId) {
        User user = findUserById(userId);
        return toResponse(user);
    }

    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: " + email));
        return toResponse(user);
    }

    // ── Profile Update ────────────────────────────────────────────

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request,
                                      Long performedByUserId, String ipAddress) {
        User user = findUserById(userId);

        if (request.getName() != null) user.setName(request.getName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());

        user = userRepository.save(user);

        auditLogService.log(
                performedByUserId,
                "USER_PROFILE_UPDATED",
                "User",
                String.valueOf(userId),
                "Profile updated",
                ipAddress
        );

        log.info("User {} profile updated by userId={}", userId, performedByUserId);
        return toResponse(user);
    }

    // ── Role Update ───────────────────────────────────────────────

    @Transactional
    public UserResponse updateRole(Long userId, UpdateRoleRequest request,
                                   Long performedByUserId, String ipAddress) {
        User user = findUserById(userId);
        String oldRole = user.getRole().name();

        user.setRole(request.getRole());
        user = userRepository.save(user);

        auditLogService.log(
                performedByUserId,
                "USER_ROLE_UPDATED",
                "User",
                String.valueOf(userId),
                "Role changed from " + oldRole + " to " + request.getRole().name(),
                ipAddress
        );

        log.info("User {} role updated to {}", userId, request.getRole());
        return toResponse(user);
    }

    // ── Activate / Deactivate ─────────────────────────────────────

    @Transactional
    public UserResponse setActiveStatus(Long userId, boolean active,
                                        Long performedByUserId, String ipAddress) {
        User user = findUserById(userId);
        user.setIsActive(active);
        user = userRepository.save(user);

        auditLogService.log(
                performedByUserId,
                active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
                "User",
                String.valueOf(userId),
                null,
                ipAddress
        );

        return toResponse(user);
    }

    // ── Private Helpers ───────────────────────────────────────────

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with id: " + userId));
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}