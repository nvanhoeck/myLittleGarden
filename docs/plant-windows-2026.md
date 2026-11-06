# Zaaiperiodes per plant (Belgie), referentie 15 april

## Methode en eerlijke kanttekening

Voor elke plant is per methode (voorzaaien binnen, uitplanten, buiten zaaien) een periode bepaald, omgezet naar weken ten opzichte van 15 april (typische laatste voorjaarsvorst, Belgisch binnenland).

### Bronnen en beperkingen

97 van 130 rijen met vensters hebben minder dan 3 bronnen; rijen met * zijn vakkennis en moeten door de gebruiker gecontroleerd worden. De beschikbare tools lieten geen drie onafhankelijke bronnen per gewas toe. Gebruikt: de Hubo-zaaikalender (alleen jan-mei leesbaar, geen uitplantdata), de Plukkers-maandkalenders (NL/BE, jan-okt), de Leefmilieu Brussel infofiche 6 (2012, 'Gemakkelijke groenten'), de Velt schoolmoestuinkalender 2025 (klein gewasaanbod), de IVN-factsheet zaaien, en webwoordenboek.nl/Gamma/Bosch voor kruiden. Per rij staat het aantal werkelijk geraadpleegde bronnen; **een ster (*) = vakkennis zonder bevestigende bron**. De meeste rijen hebben dus minder dan 3 bronnen en vragen een reviewcontrole. Aveve en Belgische zaadzakjes (Sluis, Vreeken, Bruno Nebelung) waren niet raadpleegbaar. Voorzaai- en uitplantperiodes zijn voor veel gewassen afgeleid (Hubo geeft geen uitplantdata).

## Omzetting

Een periode die in de eerste helft van een maand start begint op de 1e, anders op de 15e. Einde: laatste dag van de eindmaand (of de 15e bij "half"). fromWeeks = floor((start - 15 april)/7), toWeeks = floor((einde - 15 april)/7), zelfde jaar; loopt een periode over de jaargrens (okt-maart), dan +365 dagen bij het einde.
Voorbeeld: "buiten zaaien maart-juli" = 1 maart .. 31 juli, fromWeeks = floor(-45/7) = -7, toWeeks = floor(107/7) = 15.

Cellen tonen: periode (fromWeeks..toWeeks). Een enkel venster kan geen onderbreking uitdrukken (bv. spinazie in de zomer).

## vruchtgroenten

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| tomaat | Tomaat | mrt-apr (-7..2) | 2e helft mei-jun (4..10) | - | Hubo, Plukkers, IVN, Webwoordenboek/Gamma/Bosch (4 bronnen) | Hubo: serre maart; Plukkers: april laatste kans |
| paprika | Paprika | feb-mrt (-11..-3) | 2e helft mei-jun (4..10) | - | Plukkers, Webwoordenboek/Gamma/Bosch (2 bronnen) | uitplanten na IJsheiligen |
| komkommer | Komkommer | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | Hubo, Plukkers, IVN (3 bronnen) | Hubo: buiten zaaien mei |
| courgette | Courgette | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | Plukkers, IVN, Webwoordenboek/Gamma/Bosch (3 bronnen) |  |
| aubergine | Aubergine | 2e helft feb-mrt (-9..-3) | 2e helft mei-jun (4..10) | - | Hubo, Plukkers (2 bronnen) | Hubo/Plukkers: maart |
| pommer | Pompoen | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | Hubo, Plukkers, IVN (3 bronnen) | Hubo noemt april buiten (te vroeg voor vorstgevoelig gewas); gekozen: na IJsheiligen |
| meloen | Meloen | apr-mei (-2..6) | 2e helft mei-jun (4..10) | - | Plukkers, IVN (2 bronnen) | Directe zaai buiten niet gangbaar in Belgie; oude directSowWeeks vervalt (niet gangbaar) |
| watermeloen | Watermeloen | apr-mei (-2..6) | 2e helft mei-jun (4..10) | - | Plukkers, IVN (2 bronnen) | Directe zaai buiten niet gangbaar in Belgie; oude directSowWeeks vervalt (niet gangbaar) |
| spaanse-peper | Spaanse Peper | feb-mrt (-11..-3) | 2e helft mei-jun (4..10) | - | Plukkers, Webwoordenboek/Gamma/Bosch (2 bronnen) | zoals paprika |
| cherimoya | Cherimoya | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| vlierbes | Vlierbes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| cherry-tomaat | Cherry Tomaat | mrt-apr (-7..2) | 2e helft mei-jun (4..10) | - | Hubo, Plukkers, IVN, Webwoordenboek/Gamma/Bosch (4 bronnen) | zoals tomaat |
| augurk | Augurk | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | Hubo, Plukkers, IVN (3 bronnen) | Hubo: buiten zaaien mei |
| chilipeper | Chilipeper | feb-mrt (-11..-3) | 2e helft mei-jun (4..10) | - | Plukkers, Webwoordenboek/Gamma/Bosch (2 bronnen) | zoals paprika |

## bladgroenten

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| sla | Sla | feb-apr (-11..2) | apr-aug (-2..19) | apr-aug (-2..19) | Hubo, Plukkers, Leefmilieu-Brussel, IVN (4 bronnen) | Brussel: kropsla buiten vanaf april, uitplanten tot half augustus |
| spinazie | Spinazie | jan-feb (-15..-7) | - | mrt-okt (-7..28) | Hubo, Plukkers, IVN (3 bronnen) | Serre jan-feb; buiten maart-mei en half aug-okt; juni-juli niet aanbevolen (doorschieten), een enkel venster kan die onderbreking niet tonen; uitplanten niet gangbaar; oude transplantWeeks vervalt (niet gangbaar) |
| rucola | Rucola | - | - | mrt-sep (-7..24) | Plukkers, IVN (2 bronnen) | Compo: rucola blijft in serre/vensterbank; oude transplantWeeks vervalt (niet gangbaar) |
| andijvie | Andijvie | jun-aug (6..19) | jul-aug (11..19) | jun-jul (6..15) | Plukkers, vakkennis* (1 bron) | Belgische herfstteelt: voorzaaien (kweekbed) juni-aug, uitplanten juli-aug, direct juni-juli; vroege zaai (voor juni) schiet door; Plukkers noemt ook zaai april-aug |
| snijsla | Snijsla | - | - | 2e helft mrt-aug (-5..19) | Hubo, Plukkers, Leefmilieu-Brussel (3 bronnen) | Brussel: pluksla vanaf begin maart, snijsla vanaf mei; alleen direct gezaaid; oude indoorStartWeeks vervalt (niet gangbaar); oude transplantWeeks vervalt (niet gangbaar) |
| ijsberg-sla | IJsberg Sla | feb-apr (-11..2) | apr-aug (-2..19) | apr-aug (-2..19) | Hubo, Plukkers, Leefmilieu-Brussel (3 bronnen) | zoals sla |
| romaine-sla | Romaine Sla | feb-apr (-11..2) | apr-aug (-2..19) | apr-aug (-2..19) | Hubo, Plukkers, Leefmilieu-Brussel (3 bronnen) | zoals sla |
| snijbiet | Snijbiet | - | - | apr-jul (-2..15) | Leefmilieu-Brussel, Plukkers, IVN (3 bronnen) | Brussel: warmoes vanaf half april tot juli; uitplanten niet gangbaar; oude transplantWeeks vervalt (niet gangbaar) |
| paksoi | Paksoi | - | - | jun-sep (6..24) | Plukkers, vakkennis* (1 bron) | Plukkers: juni (Chinese kool) en sept (paksoi); oude indoorStartWeeks vervalt (niet gangbaar); oude transplantWeeks vervalt (niet gangbaar) |
| mizuna | Mizuna | - | - | 2e helft mrt-sep (-5..24) | Plukkers, vakkennis* (1 bron) | Plukkers: mosterdbladgroenten sept; verder schatting; oude transplantWeeks vervalt (niet gangbaar) |
| veldsla | Veldsla | - | - | 2e helft aug-okt (17..28) | Plukkers, vakkennis* (1 bron) | Plukkers: half aug-okt |
| rauwkost | Rauwkost | feb-apr (-11..2) | apr-aug (-2..19) | apr-aug (-2..19) | Hubo, Plukkers, Leefmilieu-Brussel (3 bronnen) | zoals sla |
| mangold | Mangold | - | - | apr-jul (-2..15) | Leefmilieu-Brussel, Plukkers, IVN (3 bronnen) | zoals snijbiet; oude transplantWeeks vervalt (niet gangbaar) |
| snijkool | Snijkool | - | - | apr-jun (-2..10) | vakkennis* (0 bronnen) | Geen bron; als boerenkool; oude transplantWeeks vervalt (niet gangbaar) |
| paardebloem | Paardebloem | - | - | apr-jul (-2..15) | vakkennis* (0 bronnen) | Geen bron geraadpleegd; oude transplantWeeks vervalt (niet gangbaar) |
| bladselderij | Bladselderij | 2e helft feb-apr (-9..2) | mei-jun (2..10) | 2e helft apr-jul (0..15) | Leefmilieu-Brussel, Plukkers, Hubo (3 bronnen) | Brussel: snijselder buiten vanaf half april tot eind juli |
| sugarloaf | Sugarloaf | apr-mei (-2..6) | jun-jul (6..15) | 2e helft mei-jul (4..15) | Plukkers, vakkennis* (1 bron) | Als andijvie/witlof-type; deels schatting |
| rode-chichorei | Rode Chichorei | apr-mei (-2..6) | jun-jul (6..15) | 2e helft mei-jul (4..15) | Plukkers, vakkennis* (1 bron) | idem |
| witlof | Witlof | - | - | apr-jun (-2..10) | Hubo (1 bron) | Hubo: april en juni volle grond; wordt direct gezaaid; oude transplantWeeks vervalt (niet gangbaar) |
| radicchio | Radicchio | apr-mei (-2..6) | jun-jul (6..15) | 2e helft mei-jul (4..15) | Plukkers, vakkennis* (1 bron) | idem |
| zuring | Zuring | - | - | mrt-mei (-7..6) | Hubo (1 bron) | Hubo: maart; oude indoorStartWeeks vervalt (niet gangbaar); oude transplantWeeks vervalt (niet gangbaar) |
| kruidplant | Kruidplant | - | - | - | - | Gewas niet eenduidig te identificeren |
| asperge | Asperge | feb-mrt (-11..-3) | mrt-apr (-7..2) | - | vakkennis* (0 bronnen) | Geen bron; kroon planten maart-april |
| kapuzijner-kers | Kapucijner Kers | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | vakkennis* (0 bronnen) | Geen bron geraadpleegd |
| selderij | Selderij | 2e helft feb-apr (-9..2) | mei-jun (2..10) | - | Leefmilieu-Brussel, Plukkers, Hubo (3 bronnen) | Direct zaaien van selderij in open lucht is niet gangbaar in Belgie (Brussel: voorzaaien/plantgoed); alleen bladselderij/snijselder wordt direct gezaaid |
| kaasstelen | Kaas Stelen | - | - | - | - | Gewas niet eenduidig te identificeren |
| stengelbiet | Stengelbiet | mrt-apr (-7..2) | mei-jun (2..10) | apr-jul (-2..15) | Leefmilieu-Brussel, Plukkers (2 bronnen) |  |
| zuringelambique | Zuringelambique | - | - | - | - | Gewas niet eenduidig te identificeren |
| waterkers | Waterkers | - | - | apr-aug (-2..19) | vakkennis* (0 bronnen) | Geen bron geraadpleegd; oude transplantWeeks vervalt (niet gangbaar) |
| prei | Prei | feb-apr (-11..2) | mei-jul (2..15) | mrt-jun (-7..10) | Hubo, Plukkers (2 bronnen) | Hubo: buiten zaaien mei en juni; Plukkers: binnen jan-maart, buiten maart; uitplanten afgeleid |

## wortelgroenten

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| wortel | Wortel | - | - | mrt-jul (-7..15) | Hubo, Plukkers, IVN (3 bronnen) | Plukkers: serre feb, buiten maart-juli |
| biet | Biet | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | apr-jul (-2..15) | Hubo, Plukkers, IVN (3 bronnen) |  |
| radijs | Radijs | - | - | mrt-sep (-7..24) | Hubo, Plukkers, Leefmilieu-Brussel, IVN (4 bronnen) | Brussel: begin maart tot half april (Saxa), laatste zaai augustus |
| knolselderij | Knolselderij | feb-apr (-11..2) | 2e helft apr-jun (0..10) | - | Leefmilieu-Brussel, Plukkers (2 bronnen) | Brussel: voorzaaien, uitplanten eind april-mei |
| pastinaak | Pastinaak | - | - | mrt-mei (-7..6) | Plukkers, IVN (2 bronnen) |  |
| schorseneer | Schorseneer | - | - | apr-mei (-2..6) | Hubo (1 bron) | Hubo: april |
| raap | Raap | - | - | mrt-aug (-7..19) | Hubo, Plukkers (2 bronnen) | Hubo raapstelen maart; Plukkers mei-juli; oude transplantWeeks vervalt (niet gangbaar) |
| rammenas | Rammenas | - | - | feb-aug (-11..19) | Hubo, vakkennis* (1 bron) | Hubo: februari (voorjaarsrammenas); winterrammenas jul-aug (schatting) |
| retichie | Retichie | - | - | - | - | Gewas niet eenduidig te identificeren |
| oca | Oca | mrt-apr (-7..2) | 2e helft mei-jun (4..10) | - | vakkennis* (0 bronnen) | Geen bron geraadpleegd |
| kleine-radijs | Kleine Radijs | - | - | mrt-sep (-7..24) | Hubo, Plukkers, Leefmilieu-Brussel, IVN (4 bronnen) | zoals radijs |
| aardappel | Aardappel | - | - | 2e helft mrt-mei (-5..6) | Plukkers, IVN (2 bronnen) | Poten van pootaardappelen: Plukkers/IVN maart-april |

## koolgewassen

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| broccoli | Broccoli | feb-apr (-11..2) | 2e helft apr-jul (0..15) | apr-jul (-2..15) | Hubo, Plukkers, IVN (3 bronnen) |  |
| boerenkool | Boerenkool | apr-mei (-2..6) | 2e helft mei-jul (4..15) | apr-jun (-2..10) | Hubo, Plukkers, Velt, Leefmilieu-Brussel (4 bronnen) | Velt: voorzaaien tot half mei; Brussel: buiten mei-juni |
| bloemkool | Bloemkool | feb-apr (-11..2) | 2e helft apr-jul (0..15) | apr-jul (-2..15) | Hubo, Plukkers (2 bronnen) |  |
| spruitjes | Spruitjes | mrt-apr (-7..2) | mei-jun (2..10) | mrt-mei (-7..6) | Hubo, Plukkers, Velt, IVN (4 bronnen) | Velt: voorzaaien tot half april |
| savooiekool | Savooiekool | mrt-apr (-7..2) | mei-jul (2..15) | 2e helft mrt-mei (-5..6) | Plukkers, Leefmilieu-Brussel (2 bronnen) | Brussel: uitplanten half mei-half juni |
| groene-kool | Groene Kool | mrt-apr (-7..2) | mei-jul (2..15) | 2e helft mrt-mei (-5..6) | Plukkers, Leefmilieu-Brussel (2 bronnen) | zoals savooiekool |
| rode-kool | Rode Kool | mrt-apr (-7..2) | mei-jul (2..15) | 2e helft mrt-mei (-5..6) | Hubo, Plukkers, Leefmilieu-Brussel (3 bronnen) | Brussel: buiten zaaien laatste week maart-eind april |
| chinese-kool | Chinese Kool | - | - | 2e helft jul-half aug (13..17) | Leefmilieu-Brussel (1 bron) | Brussel: 15 jul-15 aug; vroegere zaai schiet door (Plukkers noemt juni); uitplanten niet opgenomen; oude indoorStartWeeks vervalt (niet gangbaar); oude transplantWeeks vervalt (niet gangbaar) |
| koolrabi | Koolrabi | feb-apr (-11..2) | apr-jul (-2..15) | apr-aug (-2..19) | Plukkers, IVN (2 bronnen) |  |
| skraelkool | Skraelkool | apr-mei (-2..6) | 2e helft mei-jul (4..15) | apr-jun (-2..10) | vakkennis* (0 bronnen) | Als boerenkool; geen bron |

## peulvruchten

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| tuinboon | Tuinboon | - | - | feb-mrt (-11..-3) | Hubo, Plukkers (2 bronnen) | Ook najaarszaai okt-nov mogelijk (niet opgenomen) |
| snijboon | Snijboon | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jul (4..15) | Hubo, Plukkers (2 bronnen) | Voorzaaien/uitplanten: schatting; buiten: Hubo mei, Plukkers mei-juli |
| doperwt | Doperwt | - | - | mrt-mei (-7..6) | Hubo, Plukkers, IVN, Velt (4 bronnen) | Velt: voorzaaien in februari op vensterbank mogelijk |
| sugarsnap | Sugar Snap Erwt | - | - | mrt-mei (-7..6) | Plukkers, IVN, Velt (3 bronnen) |  |
| witte-boon | Witte Boon | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jul (4..15) | Plukkers, vakkennis* (1 bron) | zoals snijboon |
| kapucijner | Kapucijner | - | - | mrt-mei (-7..6) | vakkennis* (0 bronnen) | Als erwt; geen bron |
| linzen | Linzen | - | - | apr-mei (-2..6) | vakkennis* (0 bronnen) | Geen bron geraadpleegd |
| erwtensoep | Erwtensoep | - | - | mrt-mei (-7..6) | vakkennis* (0 bronnen) | Als erwt; geen bron |
| acker-boon | Acker Boon | - | - | feb-mrt (-11..-3) | vakkennis* (0 bronnen) | Als tuinboon; geen bron |
| dubbelboon | Dubbelboon | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jul (4..15) | Plukkers, vakkennis* (1 bron) | zoals snijboon |
| pronkboon | Pronkboon | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jul (4..15) | Plukkers, vakkennis* (1 bron) | zoals snijboon |
| limaboon | Limaboon | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | vakkennis* (0 bronnen) | Warmteminnend; geen bron |
| schuimboon | Schuimboon | - | - | - | - | Gewas niet eenduidig te identificeren |
| pronkerwt | Pronkerwt | - | - | mrt-mei (-7..6) | vakkennis* (0 bronnen) | Als erwt; geen bron |
| struikboon | Struikboon | - | - | 2e helft mei-jul (4..15) | Hubo, Plukkers (2 bronnen) |  |

## kruiden

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| basilicum | Basilicum | mrt-mei (-7..6) | 2e helft mei-jun (4..10) | 2e helft mei-jul (4..15) | Plukkers, Webwoordenboek/Gamma/Bosch, IVN (3 bronnen) |  |
| peterselie | Peterselie | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | mrt-jul (-7..15) | Plukkers, IVN, Webwoordenboek/Gamma/Bosch (3 bronnen) |  |
| bieslook | Bieslook | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | apr-jun (-2..10) | Plukkers, IVN, Webwoordenboek/Gamma/Bosch (3 bronnen) |  |
| dille | Dille | - | - | apr-jul (-2..15) | Plukkers, IVN (2 bronnen) | Plukkers noemt april binnen; dille verplant slecht |
| knoflook | Knoflook | - | - | okt-mrt (24..50) | Plukkers (1 bron) | Planten kloven okt-nov of feb-maart (Plukkers); venster okt-maart over de jaargrens |
| ui | Ui | - | mrt-apr (-7..2) | feb-apr (-11..2) | Hubo, Plukkers, IVN (3 bronnen) | Plantui maart-april; zaaiui feb-april; najaarsui (sept-okt) niet opgenomen |
| munt | Munt | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | apr-jun (-2..10) | Plukkers, IVN, Webwoordenboek/Gamma/Bosch (3 bronnen) |  |
| tijm | Tijm | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | 2e helft apr-jun (0..10) | Plukkers, Webwoordenboek/Gamma/Bosch, IVN (3 bronnen) |  |
| oregano | Oregano | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | - | Plukkers, Webwoordenboek/Gamma/Bosch (2 bronnen) |  |
| rozemarijn | Rozemarijn | feb-apr (-11..2) | 2e helft apr-jun (0..10) | - | Plukkers, Webwoordenboek/Gamma/Bosch (2 bronnen) | In catalogus getypeerd als shrub maar geteeld als tuinkruid; Bosch: moeilijk uit zaad; zoals salie/lavendel |
| salie | Salie | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | - | Plukkers, Webwoordenboek/Gamma/Bosch (2 bronnen) | Bosch: moeilijk uit zaad |
| majoraan | Majoraan | mrt-apr (-7..2) | 2e helft mei-jun (4..10) | - | Plukkers, vakkennis* (1 bron) |  |
| lavendel | Lavendel | feb-apr (-11..2) | 2e helft apr-jun (0..10) | - | Webwoordenboek/Gamma/Bosch, vakkennis* (1 bron) | Moeilijk uit zaad |
| cilantro | Cilantro | - | - | apr-jun (-2..10) | Plukkers (1 bron) | Verplant slecht; oude transplantWeeks vervalt (niet gangbaar) |
| koriander-zaad | Koriander Zaad | - | - | apr-jun (-2..10) | Plukkers (1 bron) | Verplant slecht; oude transplantWeeks vervalt (niet gangbaar) |
| dragon | Dragon | mrt-apr (-7..2) | mei-jun (2..10) | - | Plukkers, vakkennis* (1 bron) | Franse dragon niet uit zaad |
| kervel | Kervel | - | - | apr-jul (-2..15) | Hubo, Plukkers (2 bronnen) | Hubo april; verplant slecht; oude transplantWeeks vervalt (niet gangbaar) |
| bezemkruid | Bezemkruid | - | - | - | - | Gewas niet eenduidig te identificeren |
| sleutelbloem | Sleutelbloem | jan-mrt (-15..-3) | apr-mei (-2..6) | - | vakkennis* (0 bronnen) | Primula veris; direct zaaien null: zaad vraagt koudebehandeling (stratificatie) |
| goudsbloemkruid | Goudsbloem | mrt-apr (-7..2) | 2e helft apr-mei (0..6) | 2e helft mrt-jun (-5..10) | Plukkers, vakkennis* (1 bron) |  |
| chia | Chia | mrt-apr (-7..2) | 2e helft mei-jun (4..10) | - | vakkennis* (0 bronnen) | Geen bron; experimenteel |
| eetbare-bloem | Eetbare Bloem | - | - | - | - | Verzamelnaam, niet per soort te bepalen |
| maggiekruid | Maggiekruid | feb-apr (-11..2) | 2e helft apr-jun (0..10) | - | vakkennis* (0 bronnen) | Geen bron |
| bonekruid | Bonekruid | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | vakkennis* (0 bronnen) | Geen bron; zomerbonenkruid |
| bergmunt | Bergmunt | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | apr-jun (-2..10) | Plukkers, vakkennis* (1 bron) | zoals munt |
| anijs | Anijs | - | - | 2e helft apr-mei (0..6) | vakkennis* (0 bronnen) | Geen bron; wordt direct gezaaid; oude transplantWeeks vervalt (niet gangbaar) |
| mandarijnkruid | Mandarijnkruid | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | - | vakkennis* (0 bronnen) | Geen bron; als munt |
| appelmunt | Appelmunt | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | apr-jun (-2..10) | Plukkers, vakkennis* (1 bron) | zoals munt |
| tuinmint | Tuinmint | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | apr-jun (-2..10) | Plukkers, vakkennis* (1 bron) | zoals munt |
| kamille | Kamille | mrt-apr (-7..2) | 2e helft apr-mei (0..6) | - | vakkennis* (0 bronnen) | Geen bron |
| reigersbek | Reigersbek | - | - | - | - | Wild/sierplant, geen bron |
| salie-rood | Rode Salie | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | - | Plukkers, vakkennis* (1 bron) | zoals salie |
| citroensalie | Citroensalie | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | - | Plukkers, vakkennis* (1 bron) | zoals salie |
| borage | Borage | mrt-apr (-7..2) | 2e helft apr-mei (0..6) | apr-jun (-2..10) | vakkennis* (0 bronnen) | Geen bron |
| sleutelbloem-thee | Sleutelbloem Thee | jan-mrt (-15..-3) | apr-mei (-2..6) | - | vakkennis* (0 bronnen) | Primula veris; direct zaaien null: zaad vraagt koudebehandeling (stratificatie) |
| roodlover | Roodkloverbloem | - | - | apr-aug (-2..19) | vakkennis* (0 bronnen) | Trifolium pratense (rode klaver); geen voorzaai/uitplant |
| vogelvoet | Vogelvoet | - | - | - | - | Gewas niet eenduidig te identificeren |
| studentenkruid | Studentenkruid | - | - | - | - | Gewas niet eenduidig te identificeren |
| steentijm | Steentijm | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | 2e helft apr-jun (0..10) | Plukkers, vakkennis* (1 bron) | zoals tijm |
| platte-peterselie | Platte peterselie | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | mrt-jul (-7..15) | Plukkers, IVN, Webwoordenboek/Gamma/Bosch (3 bronnen) | zoals peterselie |
| akkerwinde | Akkerwinde | - | - | - | - | Wild kruid, geen teeltperiode |
| citroenmelisse | Citroenmelisse | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | - | Webwoordenboek/Gamma/Bosch, vakkennis* (1 bron) |  |
| bonenkruid | Bonenkruid | apr-mei (-2..6) | - | 2e helft mei-jun (4..10) | vakkennis* (0 bronnen) | Geen bron; wordt direct gezaaid |
| karwij | Karwij | - | - | apr-mei (-2..6) | vakkennis* (0 bronnen) | Geen bron |
| komijn | Komijn | mrt-apr (-7..2) | 2e helft mei-jun (4..10) | - | vakkennis* (0 bronnen) | Geen bron; zelden succesvol in Belgie |
| laurier | Laurier | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| pepermunt | Pepermunt | mrt-apr (-7..2) | 2e helft apr-jun (0..10) | apr-jun (-2..10) | Plukkers, vakkennis* (1 bron) | zoals munt |
| saffraan | Saffraan | - | - | - | - | Knol, herfstplanting; null volgens brief |
| koriander | Koriander | - | - | apr-jun (-2..10) | Plukkers (1 bron) | Verplant slecht; oude transplantWeeks vervalt (niet gangbaar) |

## fruit

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| aardbei | Aardbei | jan-mrt (-15..-3) | mrt-mei (-7..6) | - | Plukkers, vakkennis* (1 bron) | Zaaien uit zaad jan-maart; planten potplanten maart-april |
| perzik | Perzik | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| kers | Kers | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| blauwe-bes | Blauwe Bes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| braam | Braam | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| framboos | Framboos | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| kruisbes | Kruisbes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| aalbes | Aalbes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| druif | Druif | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| walnoot | Walnoot | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| hazelnoot | Hazelnoot | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| limoen | Limoen | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| citroen | Citroen | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| pruimen | Pruimen | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| krieken | Krieken | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| kastanje | Kastanje | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| appel | Appel | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| peer | Peer | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| abrikoos | Abrikoos | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| vijg | Vijg | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| kweepeer | Kweepeer | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| rode-bes | Rode bes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| witte-bes | Witte bes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| bosbes | Bosbes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| goji-bes | Goji bes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| vlierbes-struik | Vlierbes struik | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| aronia | Aronia | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| kiwi | Kiwi | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| kiwi-bes | Kiwi bes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| mispel | Mispel | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| moerbei | Moerbei | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |
| japanse-wijnbes | Japanse wijnbes | - | - | - | - | Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode |

## groenten

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| fennel | Venkel | apr-mei (-2..6) | mei-jun (2..10) | mei-jul (2..15) | Plukkers, IVN (2 bronnen) | Venkel verplant slecht; Plukkers: mei-juli |
| artisjok | Artisjok | feb-apr (-11..2) | 2e helft apr-mei (0..6) | - | vakkennis* (0 bronnen) | Geen bron |
| zonnebloem | Zonnebloem | apr-mei (-2..6) | mei-jun (2..10) | 2e helft apr-jun (0..10) | Plukkers, IVN (2 bronnen) |  |

## graan

| id | naam | voorzaaien binnen | uitplanten | buiten zaaien | bronnen | opmerkingen |
|---|---|---|---|---|---|---|
| amarant | Amarant | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | vakkennis* (0 bronnen) | Geen bron |
| quinoa | Quinoa | 2e helft mrt-apr (-5..2) | mei-jun (2..10) | 2e helft apr-mei (0..6) | vakkennis* (0 bronnen) | Geen bron |
| maïs | Maïs | apr-mei (-2..6) | 2e helft mei-jun (4..10) | 2e helft mei-jun (4..10) | Plukkers (1 bron) |  |
| tarwe | Tarwe | - | - | okt-nov (24..32) | vakkennis* (0 bronnen) | Wintertarwe; geen bron |
| gerst | Gerst | - | - | 2e helft sep-okt (21..28) | vakkennis* (0 bronnen) | Wintergerst; geen bron |
| rogge | Rogge | - | - | 2e helft sep-nov (21..32) | vakkennis* (0 bronnen) | Geen bron |
| haver | Haver | - | - | mrt-apr (-7..2) | vakkennis* (0 bronnen) | Zomerhaver; geen bron |
| spelt | Spelt | - | - | okt-nov (24..32) | vakkennis* (0 bronnen) | Geen bron |
| triticale | Triticale | - | - | okt-nov (24..32) | vakkennis* (0 bronnen) | Geen bron |
| boekweit | Boekweit | - | - | mei-aug (2..19) | vakkennis* (0 bronnen) | Geen bron |
| rijst | Rijst | mrt-apr (-7..2) | 2e helft mei-jun (4..10) | - | vakkennis* (0 bronnen) | Experimenteel in Belgie; geen bron |

## Planten zonder vensters

- bezemkruid (Bezemkruid): Gewas niet eenduidig te identificeren
- retichie (Retichie): Gewas niet eenduidig te identificeren
- kruidplant (Kruidplant): Gewas niet eenduidig te identificeren
- schuimboon (Schuimboon): Gewas niet eenduidig te identificeren
- perzik (Perzik): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- eetbare-bloem (Eetbare Bloem): Verzamelnaam, niet per soort te bepalen
- reigersbek (Reigersbek): Wild/sierplant, geen bron
- kaasstelen (Kaas Stelen): Gewas niet eenduidig te identificeren
- zuringelambique (Zuringelambique): Gewas niet eenduidig te identificeren
- vogelvoet (Vogelvoet): Gewas niet eenduidig te identificeren
- studentenkruid (Studentenkruid): Gewas niet eenduidig te identificeren
- cherimoya (Cherimoya): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- akkerwinde (Akkerwinde): Wild kruid, geen teeltperiode
- vlierbes (Vlierbes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- kers (Kers): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- blauwe-bes (Blauwe Bes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- braam (Braam): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- framboos (Framboos): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- kruisbes (Kruisbes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- aalbes (Aalbes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- druif (Druif): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- walnoot (Walnoot): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- hazelnoot (Hazelnoot): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- laurier (Laurier): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- limoen (Limoen): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- citroen (Citroen): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- saffraan (Saffraan): Knol, herfstplanting; null volgens brief
- pruimen (Pruimen): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- krieken (Krieken): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- kastanje (Kastanje): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- appel (Appel): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- peer (Peer): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- abrikoos (Abrikoos): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- vijg (Vijg): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- kweepeer (Kweepeer): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- rode-bes (Rode bes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- witte-bes (Witte bes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- bosbes (Bosbes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- goji-bes (Goji bes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- vlierbes-struik (Vlierbes struik): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- aronia (Aronia): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- kiwi (Kiwi): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- kiwi-bes (Kiwi bes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- mispel (Mispel): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- moerbei (Moerbei): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
- japanse-wijnbes (Japanse wijnbes): Boom/struik/fruit: als stek/pot geplant, geen zaaiperiode
