package tn.ferraille.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ferraille.common.ApiException;
import tn.ferraille.security.JwtService;
import tn.ferraille.user.AuthDtos.AuthResponse;
import tn.ferraille.user.AuthDtos.LoginRequest;
import tn.ferraille.user.AuthDtos.RegisterRequest;
import tn.ferraille.user.AuthDtos.UserResponse;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final tn.ferraille.listing.ListingRepository listingRepository;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw ApiException.conflict("Un compte existe déjà avec cet email");
        }
        if (request.sellerType() == SellerType.PRO && (request.shopName() == null || request.shopName().isBlank())) {
            throw ApiException.badRequest("Le nom de la casse est obligatoire pour un compte pro");
        }
        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPhone(request.phone());
        user.setCity(request.city());
        user.setSellerType(request.sellerType());
        user.setShopName(request.shopName());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);
        return new AuthResponse(jwtService.generate(user), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .filter(u -> u.getPasswordHash() != null && passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email ou mot de passe incorrect"));
        return new AuthResponse(jwtService.generate(user), UserResponse.from(user));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, AuthDtos.ProfileRequest request) {
        if (request.sellerType() == SellerType.PRO && (request.shopName() == null || request.shopName().isBlank())) {
            throw ApiException.badRequest("Le nom de la casse est obligatoire pour un compte pro");
        }
        User user = require(userId);
        user.setFullName(request.fullName().trim());
        user.setPhone(blankToNull(request.phone()));
        user.setWhatsapp(blankToNull(request.whatsapp()));
        user.setFacebookUrl(blankToNull(request.facebookUrl()));
        user.setCity(blankToNull(request.city()));
        user.setSellerType(request.sellerType());
        user.setShopName(request.sellerType() == SellerType.PRO ? request.shopName().trim() : null);
        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(Long userId, AuthDtos.PasswordRequest request) {
        User user = require(userId);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Mot de passe actuel incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    @Transactional
    public AuthResponse loginWithFacebook(FacebookClient.FacebookProfile profile) {
        User user = userRepository.findByFacebookId(profile.id())
                .or(() -> profile.email() == null ? java.util.Optional.empty()
                        : userRepository.findByEmailIgnoreCase(profile.email()))
                .orElseGet(() -> {
                    User created = new User();
                    created.setFullName(profile.name() == null || profile.name().isBlank() ? "Membre Ferraille" : profile.name());
                    created.setEmail(profile.email() == null ? null : profile.email().toLowerCase());
                    created.setSellerType(SellerType.PARTICULIER);
                    return created;
                });
        user.setFacebookId(profile.id());
        if (profile.pictureUrl() != null) {
            user.setAvatarUrl(profile.pictureUrl());
        }
        userRepository.save(user);
        return new AuthResponse(jwtService.generate(user), UserResponse.from(user));
    }

    @Transactional
    public void deleteAccount(Long userId) {
        User user = require(userId);
        listingRepository.archiveAllBySeller(userId);
        user.setFullName("Compte supprimé");
        user.setEmail(null);
        user.setPhone(null);
        user.setWhatsapp(null);
        user.setFacebookUrl(null);
        user.setFacebookId(null);
        user.setAvatarUrl(null);
        user.setShopName(null);
        user.setPasswordHash(null);
        user.setCity(null);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional(readOnly = true)
    public User require(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
    }
}
