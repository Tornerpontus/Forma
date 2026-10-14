# Generates supabase/migrations/..._exercise_library.sql. Format: name|muscle|equipment|weight_mode|unilateral|secondary
DATA = """
Bänkpress|chest|barbell|total|0|triceps,shoulders
Lutande bänkpress|chest|barbell|total|0|shoulders,triceps
Nedåtlutande bänkpress|chest|barbell|total|0|triceps
Smalgreppad bänkpress|triceps|barbell|total|0|chest
Hantelpress|chest|dumbbell|per_dumbbell|0|triceps,shoulders
Lutande hantelpress|chest|dumbbell|per_dumbbell|0|shoulders,triceps
Nedåtlutande hantelpress|chest|dumbbell|per_dumbbell|0|triceps
Hantelflyes|chest|dumbbell|per_dumbbell|0|
Lutande hantelflyes|chest|dumbbell|per_dumbbell|0|shoulders
Kabelflyes|chest|cable|total|0|
Kabelflyes nedifrån|chest|cable|total|0|shoulders
Kabelflyes uppifrån|chest|cable|total|0|
Bröstpress maskin|chest|machine|total|0|triceps
Lutande bröstpress maskin|chest|machine|total|0|shoulders
Pec deck|chest|machine|total|0|
Smith bänkpress|chest|smith|total|0|triceps
Lutande smith bänkpress|chest|smith|total|0|shoulders
Armhävningar|chest|bodyweight|bodyweight|0|triceps,shoulders
Dips bröst|chest|bodyweight|bodyweight|0|triceps
Pullover hantel|chest|dumbbell|total|0|back
Marklyft|back|barbell|total|0|hamstrings,glutes
Rumänska marklyft|hamstrings|barbell|total|0|glutes,back
Stela marklyft|hamstrings|barbell|total|0|glutes
Sumomarklyft|back|barbell|total|0|glutes,quads
Trap bar marklyft|back|trap_bar|total|0|quads,glutes
Skivstångsrodd|back|barbell|total|0|biceps
Pendlay-rodd|back|barbell|total|0|biceps
T-stångsrodd|back|plate|total|0|biceps
Hantelrodd|back|dumbbell|per_dumbbell|1|biceps
Lutande hantelrodd|back|dumbbell|per_dumbbell|0|biceps
Sittande kabelrodd|back|cable|total|0|biceps
Enarms kabelrodd|back|cable|total|1|biceps
Maskinrodd|back|machine|total|0|biceps
Bröststödd rodd maskin|back|machine|total|0|biceps
Latsdrag|back|cable|total|0|biceps
Latsdrag smalt grepp|back|cable|total|0|biceps
Latsdrag underhandsgrepp|back|cable|total|0|biceps
Enarms latsdrag|back|cable|total|1|biceps
Raka armar latsdrag|back|cable|total|0|
Chins|back|bodyweight|bodyweight|0|biceps
Pull-ups|back|bodyweight|bodyweight|0|biceps
Assisterade chins|back|machine|total|0|biceps
Inverterad rodd|back|bodyweight|bodyweight|0|biceps
Rygglyft|back|bodyweight|bodyweight|0|glutes,hamstrings
Good mornings|hamstrings|barbell|total|0|back
Shrugs skivstång|traps|barbell|total|0|
Shrugs hantlar|traps|dumbbell|per_dumbbell|0|
Militärpress|shoulders|barbell|total|0|triceps
Sittande axelpress hantlar|shoulders|dumbbell|per_dumbbell|0|triceps
Stående axelpress hantlar|shoulders|dumbbell|per_dumbbell|0|triceps
Arnoldpress|shoulders|dumbbell|per_dumbbell|0|triceps
Axelpress maskin|shoulders|machine|total|0|triceps
Smith axelpress|shoulders|smith|total|0|triceps
Sidolyft hantlar|shoulders|dumbbell|per_dumbbell|0|
Sidolyft kabel|shoulders|cable|total|1|
Sidolyft maskin|shoulders|machine|total|0|
Framåtlyft hantlar|shoulders|dumbbell|per_dumbbell|0|
Omvända flyes hantlar|shoulders|dumbbell|per_dumbbell|0|back
Omvänd pec deck|shoulders|machine|total|0|back
Face pulls|shoulders|cable|total|0|back,traps
Upright row|shoulders|barbell|total|0|traps
Landmine press|shoulders|barbell|total|1|chest,triceps
Bicepscurl skivstång|biceps|barbell|total|0|forearms
Bicepscurl EZ-stång|biceps|ez_bar|total|0|forearms
Bicepscurl hantlar|biceps|dumbbell|per_dumbbell|0|forearms
Hammercurl|biceps|dumbbell|per_dumbbell|0|forearms
Lutande hantelcurl|biceps|dumbbell|per_dumbbell|0|
Koncentrationscurl|biceps|dumbbell|total|1|
Scottcurl|biceps|ez_bar|total|0|
Scottcurl maskin|biceps|machine|total|0|
Bicepscurl kabel|biceps|cable|total|0|
Spidercurl|biceps|dumbbell|per_dumbbell|0|
Triceps pushdown|triceps|cable|total|0|
Triceps pushdown rep|triceps|cable|total|0|
Triceps overhead kabel|triceps|cable|total|0|
Skull crushers|triceps|ez_bar|total|0|
Fransk press hantel|triceps|dumbbell|total|0|
Triceps kickback|triceps|dumbbell|per_dumbbell|1|
Dips|triceps|bodyweight|bodyweight|0|chest,shoulders
Bänkdips|triceps|bodyweight|bodyweight|0|
Dips maskin|triceps|machine|total|0|chest
Handledscurl|forearms|barbell|total|0|
Omvänd handledscurl|forearms|barbell|total|0|
Farmers walk|forearms|dumbbell|per_dumbbell|0|traps,full_body
Knäböj|quads|barbell|total|0|glutes,hamstrings
Frontböj|quads|barbell|total|0|glutes,abs
Smith knäböj|quads|smith|total|0|glutes
Gobletknäböj|quads|dumbbell|total|0|glutes
Bulgarian split squat|quads|dumbbell|per_dumbbell|1|glutes
Utfallssteg|quads|dumbbell|per_dumbbell|1|glutes
Gående utfall|quads|dumbbell|per_dumbbell|1|glutes
Step-ups|quads|dumbbell|per_dumbbell|1|glutes
Benpress|quads|machine|total|0|glutes
Enbens benpress|quads|machine|total|1|glutes
Hack squat|quads|machine|total|0|glutes
Benspark|quads|machine|total|0|
Enbens benspark|quads|machine|total|1|
Pendulum squat|quads|machine|total|0|glutes
Sissy squat|quads|bodyweight|bodyweight|0|
Liggande lårcurl|hamstrings|machine|total|0|
Sittande lårcurl|hamstrings|machine|total|0|
Stående lårcurl|hamstrings|machine|total|1|
Nordic curls|hamstrings|bodyweight|bodyweight|0|
Rumänska marklyft hantlar|hamstrings|dumbbell|per_dumbbell|0|glutes
Enbens rumänska marklyft|hamstrings|dumbbell|total|1|glutes
Hip thrust|glutes|barbell|total|0|hamstrings
Hip thrust maskin|glutes|machine|total|0|hamstrings
Glute bridge|glutes|barbell|total|0|hamstrings
Kabelkickback|glutes|cable|total|1|
Glute kickback maskin|glutes|machine|total|1|
Abduktor maskin|glutes|machine|total|0|
Adduktor maskin|adductors|machine|total|0|
Copenhagen plank|adductors|bodyweight|bodyweight|1|abs
Kettlebell swing|glutes|kettlebell|total|0|hamstrings,back
Stående vadpress|calves|machine|total|0|
Sittande vadpress|calves|machine|total|0|
Vadpress i benpress|calves|machine|total|0|
Enbens vadpress|calves|dumbbell|total|1|
Smith vadpress|calves|smith|total|0|
Plankan|abs|bodyweight|bodyweight|0|
Sidoplanka|abs|bodyweight|bodyweight|1|
Crunches|abs|bodyweight|bodyweight|0|
Kabelcrunch|abs|cable|total|0|
Hängande benlyft|abs|bodyweight|bodyweight|0|
Benlyft i ställning|abs|bodyweight|bodyweight|0|
Ab wheel|abs|other|bodyweight|0|
Russian twist|abs|plate|total|0|
Pallof press|abs|cable|total|1|
Crunch maskin|abs|machine|total|0|
Dead bug|abs|bodyweight|bodyweight|0|
Bird dog|abs|bodyweight|bodyweight|0|back
Rumänsk marklyft kettlebell|hamstrings|kettlebell|total|0|glutes
Kettlebell goblet squat|quads|kettlebell|total|0|glutes
Turkish get-up|full_body|kettlebell|total|1|shoulders,abs
Thrusters|full_body|barbell|total|0|quads,shoulders
Frivändning|full_body|barbell|total|0|back,quads
Ryck|full_body|barbell|total|0|shoulders,quads
Burpees|full_body|bodyweight|bodyweight|0|
Slädpush|full_body|other|total|0|quads
Löpning|cardio|other|bodyweight|0|
Löpband|cardio|machine|bodyweight|0|
Roddmaskin|cardio|machine|bodyweight|0|back
Cykel|cardio|machine|bodyweight|0|quads
Crosstrainer|cardio|machine|bodyweight|0|
Trappmaskin|cardio|machine|bodyweight|0|glutes
Assault bike|cardio|machine|bodyweight|0|
Hopprep|cardio|other|bodyweight|0|calves
Promenad|cardio|other|bodyweight|0|
Simning|cardio|other|bodyweight|0|full_body
Skierg|cardio|machine|bodyweight|0|back
"""
rows = []
for line in DATA.strip().splitlines():
    name, mg, eq, wm, uni, sec = line.split("|")
    secs = "{" + ",".join(s for s in sec.split(",") if s) + "}"
    n = name.replace("'", "''")
    rows.append(f"  ('{n}', '{mg}', '{eq}', '{wm}', {'true' if uni=='1' else 'false'}, '{secs}')")
sql = "-- FORMA – global exercise library (generated by scripts/gen_exercises.py)\n"
sql += "insert into public.exercises (name, muscle_group, equipment, weight_mode, is_unilateral, secondary_muscles) values\n"
sql += ",\n".join(rows) + "\non conflict do nothing;\n"
open("supabase/migrations/20261014000002_exercise_library.sql", "w").write(sql)
print(len(rows), "exercises")
