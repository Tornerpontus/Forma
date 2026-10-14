# FORMA – Morgonrapport 15 oktober

Kort version: appen är byggd och fungerar lokalt. Alla fyra faserna är gjorda, utom några delar som listas under punkt 4.
Allt i punkt 2 är kontrollerat med automatiska tester. Det som återstår för att ni ska kunna använda den på telefonerna
är att skapa ett Supabase-konto och lägga upp appen (punkt 6–8). Det fick jag inte göra själv.

Specifikationen från tidigare fanns inte i projektet. Allt är byggt utifrån nattens instruktioner.

## 1. Vad som byggts

- **Träning:**
  - Övningsbibliotek med 150 övningar på svenska.
  - Egna övningar och varianter.
  - Programbyggare med PPL, Överkropp/Underkropp, Helkropp eller egna program, utan fasta dagar.
- **Aktivt pass:**
  - Bocka av ett set med ett tryck.
  - Förra passets värden visas grått i fälten, så ett tryck upprepar förra gången.
  - Lägg till, ta bort och kopiera set, och välj uppvärmnings-, arbets-, failure- eller dropset.
  - RIR om du vill ha det.
  - Vilotimer och passtimer.
  - Anteckningar, och möjlighet att byta, flytta och lägga till övningar.
  - Vikt per hantel och unilaterala övningar.
- **Autospar:** varje ändring sparas direkt i telefonen och skickas till servern inom en sekund. Ett pass överlever omladdning, krasch och tappad uppkoppling.
- **Historik:** alla pass kan öppnas, ändras och tas bort.
- **Progression:**
  - e1RM och personliga rekord.
  - Jämförelse vecka mot vecka och månad mot månad.
  - Förslag på nästa vikt och reps, baserat bara på er riktiga historik.
  - Diagram för 7 d, 30 d, 90 d, 6 mån och allt.
- **Kost:**
  - Dagliga mål för kcal och makron.
  - Loggning i gram per måltid.
  - Egna livsmedel, sparade måltider och recept.
  - Dags- och veckostatistik.
- **Kropp och mål:**
  - Vikt med 7-dagarssnitt, trend och målvikt.
  - Kroppsmått.
  - Styrkemål, till exempel 100 kg × 5 i knäböj.
  - Mål för antal pass per vecka.
  - Översikt på startsidan.
- **Kondition (nytt i natt):** tid och distans för löpning, rodd, cykel med flera, med tempo, rekord och diagram.
- **Partnerdelning (nytt i natt):**
  - Den ena skapar en engångskod under Profil, och den andra skriver in den.
  - Mottagaren kan då **bara läsa** den förstas avslutade pass och rekord.
  - Kost, vikt, mått, mål och program delas aldrig.
  - Båda kan avsluta delningen när som helst.
  - Delningen går en väg. Vill ni se varandra skapar ni var sin kod.

## 2. Vad som faktiskt fungerar (verifierat)

Allt nedan är testat automatiskt mot en lokal Supabase-databas i mobilformat (390×844):

- Två konton skapas och loggar in, och de ser aldrig varandras data. Det testas direkt mot databasen med riktiga konton.
- Hela flödet: skapa program, starta pass, logga set, ladda om sidan mitt i passet, avsluta, se historik, se förra passets värden, sätta PR och se diagram.
- Passet fortsätter offline och synkar när nätet kommer tillbaka. Efter en krasch vinner den lokala kopian om den är nyare.
- Kost: mål, loggning, eget livsmedel, recept och statistik.
- Kropp: vikt, snitt, mått och mål.
- Kondition: logga tid och distans, se tempo, och upprepa förra passet med ett tryck.
- Partnerdelning:
  - Ingen ser något innan koden lösts in.
  - Koden fungerar bara en gång.
  - Partnern kan inte ändra något.
  - När delningen avslutas försvinner åtkomsten direkt.
  - Partnerns pass blandas aldrig in i ens egen statistik.

## 3. Vad som testats

| Test | Antal | Resultat |
|---|---|---|
| Enhetstester (beräkningar: e1RM, PR, progression, kost, vikttrend, kondition) | 32 | alla gröna |
| Säkerhetstester mot databasen (dataseparation, delning, rättigheter) | 18 | alla gröna |
| End-to-end i mobilformat (7 hela användarflöden) | 7 | alla gröna |
| Typkontroll, lint och produktionsbygge | – | gröna |

Jag har också gått igenom skärmbilder av alla vyer för att kontrollera layouten.

## 4. Vad som inte är klart eller inte är testat

- **Byggt men inte testat:**
  - Sökning i Open Food Facts och uppslag på streckkodsnummer. Nätverket här blockerar sajten, så det har aldrig körts mot den riktiga tjänsten.
  - Ljud och vibration i vilotimern på riktig telefon.
  - Återställning av lösenord via e-post, eftersom det inte finns någon e-postserver här.
  - Att starta ett helt nytt pass helt utan uppkoppling. Tappad uppkoppling mitt i ett pass är testat.
- **Inte byggt:**
  - Livsmedelsverkets databas. Den var blockerad härifrån, och jag har inte hittat på några näringsvärden.
  - Kameraskanning av streckkoder.
  - Progressbilder.
  - Påminnelser och notiser.
  - En granskning med skärmläsare.

## 5. Kända buggar och begränsningar

- Inga kända fel kvar i de testade flödena.
- **Fixat i natt:** ett pass som startades inom någon sekund efter inloggning kunde försvinna. Det har nu ett eget test.
- Datumfälten visar webbläsarens eget datumformat.
- Huvudfilen är cirka 157 kB komprimerad. Det är okej, men den kan delas upp mer.

## 6. Det här behöver du konfigurera

1. **Skapa ett Supabase-projekt** på supabase.com. Gratisnivån räcker, och du kan välja regionen Stockholm.
2. **Kör databasmigrationerna** från projektmappen: `npx supabase login`, sedan `npx supabase link --project-ref <ref>`, sedan `npx supabase db push`.
3. Under **Authentication → URL Configuration**, sätt *Site URL* och *Redirect URLs* till appens adress.
4. Bestäm om e-postbekräftelse ska vara på (rekommenderas). När ni båda har konton kan du stänga av nya registreringar.
5. Sätt `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY` (Project Settings → API) i `.env.local` eller hos hostingtjänsten. Använd aldrig service_role-nyckeln.
6. **Hosting med HTTPS** krävs för att kunna installera appen på telefonen. Vercel, Netlify och Cloudflare Pages fungerar, med fallback till `index.html`.

Detaljerade steg finns i `README.md`.

## 7. Så startar du appen

- **Hämta koden:** `git clone /mnt/project-files/forma.bundle forma`. Källkoden finns också i `/mnt/project-files/forma`.
- **Lokalt:**
  1. Kör `npm install` och `npm run db:start`. Det kräver Docker.
  2. Fyll i `.env.local` med värdena från `npx supabase status -o env`.
  3. Kör `npm run dev`.
- **Produktion:** kör `npm run build` och lägg upp mappen `dist/` hos hostingtjänsten.

## 8. Så installerar ni den på telefonerna

- **iPhone:** öppna adressen i Safari, tryck på dela-knappen och välj *Lägg till på hemskärmen*.
- **Android:** öppna adressen i Chrome, gå till menyn ⋮ och välj *Installera app*.

Därefter startar appen i helskärm som en vanlig app. Instruktionerna finns också i appen under Profil.

## 9. Rekommenderade nästa steg

1. Sätt upp Supabase och hosting enligt punkt 6, och testa sedan ett riktigt pass på båda telefonerna.
2. Testa vilotimerns ljud och vibration samt Open Food Facts-sökningen på riktig telefon.
3. Importera Livsmedelsverkets livsmedelsdatabas och lägg till kameraskanning av streckkoder.
4. Bygg progressbilder med privat lagring per person.
5. Lägg till påminnelser och gör en granskning med VoiceOver och TalkBack.
