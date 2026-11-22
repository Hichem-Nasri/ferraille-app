package tn.ferraille.user;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tn.ferraille.common.ApiException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

@Component
public class FacebookClient {

    public record FacebookProfile(String id, String name, String email, String pictureUrl) {
    }

    private static final String GRAPH = "https://graph.facebook.com/v19.0";

    private final String appId;
    private final String appSecret;
    private final RestClient restClient;

    public FacebookClient(@Value("${ferraille.facebook.app-id:}") String appId,
                          @Value("${ferraille.facebook.app-secret:}") String appSecret) {
        this.appId = appId;
        this.appSecret = appSecret;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(8000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public boolean isConfigured() {
        return !appId.isBlank() && !appSecret.isBlank();
    }

    public String appId() {
        return appId;
    }

    public FacebookProfile verify(String accessToken) {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "La connexion Facebook n'est pas encore activée");
        }
        try {
            JsonNode debug = restClient.get()
                    .uri(GRAPH + "/debug_token?input_token={token}&access_token={app}", accessToken, appId + "|" + appSecret)
                    .retrieve().body(JsonNode.class);
            JsonNode data = debug == null ? null : debug.path("data");
            if (data == null || !data.path("is_valid").asBoolean(false) || !appId.equals(data.path("app_id").asText())) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Connexion Facebook refusée");
            }
            JsonNode me = restClient.get()
                    .uri(GRAPH + "/me?fields=id,name,email,picture.type(large)&access_token={token}&appsecret_proof={proof}",
                            accessToken, proof(accessToken))
                    .retrieve().body(JsonNode.class);
            if (me == null || me.path("id").asText().isBlank()) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Profil Facebook introuvable");
            }
            if (!me.path("id").asText().equals(data.path("user_id").asText())) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Connexion Facebook refusée");
            }
            String picture = me.path("picture").path("data").path("url").asText(null);
            String email = me.path("email").asText(null);
            return new FacebookProfile(me.path("id").asText(), me.path("name").asText(null),
                    email == null || email.isBlank() ? null : email, picture);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Facebook ne répond pas, réessaie dans un instant");
        }
    }

    private String proof(String accessToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(accessToken.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
