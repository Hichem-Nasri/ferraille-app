package tn.ferraille.security;

public record AuthenticatedUser(Long id, String email, String role) {
}
