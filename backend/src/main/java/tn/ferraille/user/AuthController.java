package tn.ferraille.user;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.security.AuthenticatedUser;
import tn.ferraille.user.AuthDtos.AuthResponse;
import tn.ferraille.user.AuthDtos.LoginRequest;
import tn.ferraille.user.AuthDtos.RegisterRequest;
import tn.ferraille.user.AuthDtos.UserResponse;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final FacebookClient facebookClient;

    @org.springframework.beans.factory.annotation.Value("${ferraille.facebook.group-url:}")
    private String facebookGroupUrl;

    @GetMapping("/api/auth/config")
    public AuthDtos.AuthConfig config() {
        return new AuthDtos.AuthConfig(facebookClient.isConfigured() ? facebookClient.appId() : null,
                facebookGroupUrl == null || facebookGroupUrl.isBlank() ? null : facebookGroupUrl);
    }

    @PostMapping("/api/auth/facebook")
    public AuthResponse facebook(@Valid @RequestBody AuthDtos.FacebookLoginRequest request) {
        return authService.loginWithFacebook(facebookClient.verify(request.accessToken()));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/api/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@AuthenticationPrincipal AuthenticatedUser principal) {
        authService.deleteAccount(principal.id());
    }

    @PostMapping("/api/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/api/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PutMapping("/api/me")
    public UserResponse updateProfile(@AuthenticationPrincipal AuthenticatedUser principal,
                                      @Valid @RequestBody AuthDtos.ProfileRequest request) {
        return authService.updateProfile(principal.id(), request);
    }

    @PutMapping("/api/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal AuthenticatedUser principal,
                               @Valid @RequestBody AuthDtos.PasswordRequest request) {
        authService.changePassword(principal.id(), request);
    }

    @GetMapping("/api/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return UserResponse.from(authService.require(principal.id()));
    }
}
