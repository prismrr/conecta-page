package runners;

import com.intuit.karate.junit5.Karate;

class KarateApiTest {

    @Karate.Test
    Karate runApiScenarios() {
        return Karate.run("classpath:features/inscricoes-upsert.feature");
    }
}
