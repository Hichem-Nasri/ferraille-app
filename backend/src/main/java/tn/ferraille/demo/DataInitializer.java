package tn.ferraille.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.ferraille.config.FerrailleProperties;
import tn.ferraille.listing.Category;
import tn.ferraille.listing.Listing;
import tn.ferraille.listing.ListingRepository;
import tn.ferraille.listing.PartCondition;
import tn.ferraille.listing.VehicleFit;
import tn.ferraille.user.Role;
import tn.ferraille.user.SellerType;
import tn.ferraille.user.User;
import tn.ferraille.user.UserRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final FerrailleProperties properties;
    private final UserRepository userRepository;
    private final ListingRepository listingRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        createAdmin();
        if (properties.demoData() && listingRepository.count() == 0) {
            createDemoData();
        }
    }

    private void createAdmin() {
        String email = properties.adminEmail();
        String password = properties.adminPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()
                || userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }
        User admin = user("Administrateur Ferraille", email, "Tunis", SellerType.PARTICULIER, null, password);
        admin.setRole(Role.ADMIN);
        admin.setVerified(true);
        userRepository.save(admin);
        log.info("Compte administrateur créé : {}", email);
    }

    private void createDemoData() {
        User casse = user("Mourad Ben Ali", "casse@demo.ferraille.tn", "Tunis", SellerType.PRO, "Casse Moncef Bey", "demo12345");
        casse.setVerified(true);
        casse.setPhone("+216 71 000 000");
        User karim = user("Karim", "karim@demo.ferraille.tn", "Sousse", SellerType.PARTICULIER, null, "demo12345");
        karim.setPhone("+216 98 000 000");
        User acheteur = user("Sami", "sami@demo.ferraille.tn", "Sfax", SellerType.PARTICULIER, null, "demo12345");
        acheteur.setPhone("+216 55 000 000");
        userRepository.saveAll(List.of(casse, karim, acheteur));

        listingRepository.saveAll(List.of(
                listing(casse, "Phare avant gauche LED", Category.ECLAIRAGE, PartCondition.TRES_BON, "180", true, "Tunis",
                        "Phare d'origine démonté d'une 208 accidentée à l'arrière. Aucun choc, fixations intactes.",
                        new VehicleFit("Peugeot", "208", 2012, 2019)),
                listing(karim, "4 jantes alu 15″ d'origine", Category.JANTES_PNEUS, PartCondition.BON, "520", true, "Sousse",
                        "Entraxe 4x108. Petites rayures de trottoir sur une jante.",
                        new VehicleFit("Peugeot", "208", 2012, 2019), new VehicleFit("Citroën", "C3", 2009, 2016)),
                listing(karim, "Rétroviseur droit électrique", Category.CARROSSERIE, PartCondition.TRES_BON, "95", false, "Sousse",
                        "Rétroviseur complet avec moteur et clignotant.",
                        new VehicleFit("Kia", "Rio", 2017, 2020)),
                listing(casse, "Alternateur 90A testé", Category.ELECTRICITE, PartCondition.BON, "240", false, "Ben Arous",
                        "Testé sur banc, garantie casse 1 mois.",
                        new VehicleFit("Renault", "Clio 4", 2013, 2019)),
                listing(casse, "Démarreur 1.2 PureTech", Category.MOTEUR, PartCondition.BON, "150", true, "Tunis",
                        "Démarreur d'origine, fonctionne parfaitement.",
                        new VehicleFit("Peugeot", "208", 2014, 2019), new VehicleFit("Peugeot", "2008", 2014, 2019)),
                listing(casse, "Porte arrière droite grise", Category.CARROSSERIE, PartCondition.BON, "310", true, "Tunis",
                        "Couleur gris aluminium, sans vitre.",
                        new VehicleFit("Volkswagen", "Golf 7", 2013, 2020))));
        log.info("Données de démonstration créées");
    }

    private User user(String name, String email, String city, SellerType type, String shop, String password) {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setCity(city);
        u.setSellerType(type);
        u.setShopName(shop);
        u.setPasswordHash(passwordEncoder.encode(password));
        return u;
    }

    private Listing listing(User seller, String title, Category category, PartCondition condition, String price,
                            boolean negotiable, String city, String description, VehicleFit... fits) {
        Listing l = new Listing();
        l.setSeller(seller);
        l.setTitle(title);
        l.setCategory(category);
        l.setCondition(condition);
        l.setPrice(new BigDecimal(price).setScale(3));
        l.setNegotiable(negotiable);
        l.setCity(city);
        l.setDescription(description);
        l.setFits(new ArrayList<>(List.of(fits)));
        return l;
    }
}
