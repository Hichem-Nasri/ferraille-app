package tn.ferraille.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email String email,
            @Size(max = 30) String phone,
            @NotBlank @Size(min = 8, max = 72) String password,
            @Size(max = 80) String city,
            @NotNull SellerType sellerType,
            @Size(max = 120) String shopName) {
    }

    public record ProfileRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) String phone,
            @Size(max = 80) String city,
            @NotNull SellerType sellerType,
            @Size(max = 120) String shopName) {
    }

    public record PasswordRequest(@NotBlank String currentPassword,
                                  @NotBlank @Size(min = 8, max = 72) String newPassword) {
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record UserResponse(Long id, String fullName, String displayName, String email, String phone,
                               String city, Role role, SellerType sellerType, String shopName, boolean verified) {

        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getFullName(), u.getDisplayName(), u.getEmail(), u.getPhone(),
                    u.getCity(), u.getRole(), u.getSellerType(), u.getShopName(), u.isVerified());
        }
    }

    public record AuthResponse(String token, UserResponse user) {
    }
}
