"""完整数值平衡推演（v2 数值策划重新平衡）"""

# 新版车辆表
vehicleTable_v2 = [
    (1,   80,   8, 1,    20),
    (2,  100,  10, 1,    40),
    (3,  120,   8, 2,    90),
    (4,  150,  10, 2,   200),
    (5,  180,  11, 2,   430),
    (6,  220,  11, 2,   920),
    (7,  260,  10, 3,  1980),
    (8,  300,  12, 3,  4250),
    (9,  340,  10, 4,  9130),
    (10, 380,  12, 4, 19630),
    (15, 620,  16, 5, 901900),
    (20, 950,  17, 7, 41430000),
    (30,1800,  25,10, 87447000000),
    (40,2910,  33,13, 185000000000000),
    (50,4250,  41,16, 387451000000000000),
]

SHOOT_INTERVAL = 0.3

def dps(atk, bullets):
    return atk * bullets / SHOOT_INTERVAL

# Boss 公式 v2
def boss_hp(stage, base=400, grow=1.07):
    return base * (grow ** (stage - 1))

def boss_dmg(stage, base=5, scale=0.3):
    return base + stage * scale

def boss_count(stage, base=2, interval=5, max_=9):
    return min(max_, base + (stage-1) // interval)

def boss_interval(stage, base=1500, dec=20, min_=500):
    return max(min_, base - (stage-1) * dec)

# 敌车 HP
def enemy_hp(stage, baseHp, grow=1.06):
    return baseHp * (grow ** (stage - 1))

# 通关奖励 v2
def reward_coins(stage, base=200, grow=1.18):
    return base * (grow ** (stage - 1))

print("=" * 110)
print(f"{'关':>3} {'车':>3} {'车HP':>5} {'ATK':>4} {'弹':>3} {'DPS':>7} | "
      f"{'BossHP':>9} {'击杀(s)':>7} {'Boss弹/s':>8} {'弹伤':>4} {'玩家死(s)':>9} | "
      f"{'敌车HP':>5} {'通关金币':>10}")
print("=" * 110)

for stage, lv in [(1,1),(2,2),(3,3),(4,4),(5,5),(8,7),(10,9),(15,12),(20,16),(30,25),(40,35),(50,45)]:
    car = next((v for v in vehicleTable_v2 if v[0] == lv), None)
    if not car:
        car = max([v for v in vehicleTable_v2 if v[0] <= lv], key=lambda v: v[0])
    _, hp, atk, bullets, _ = car
    pdps = dps(atk, bullets)
    bhp = boss_hp(stage)
    kill = bhp / pdps
    bcnt = boss_count(stage)
    binv = boss_interval(stage)
    bdmg = boss_dmg(stage)
    boss_dps = bcnt * bdmg / (binv / 1000)  # Boss对玩家dps
    player_die = hp / boss_dps
    ehp = enemy_hp(stage, 30)  # normal敌车
    rcoins = reward_coins(stage)
    print(f"{stage:>3} {lv:>3} {hp:>5} {atk:>4} {bullets:>3} {pdps:>7.0f} | "
          f"{bhp:>9.0f} {kill:>7.1f} {bcnt:>3}*{1000/binv:.1f} {bdmg:>4.1f} {player_die:>9.1f} | "
          f"{ehp:>5.0f} {rcoins:>10.0f}")

print("\n经济循环：检查通关收益 vs 下一辆车成本（1/3=可买）")
print(f"{'关卡':>4} {'通关金币':>15} {'下一车成本/3':>18} {'达标':>6}")
buy_prices = [(1,100),(5,46883),(10,14540377),(15,4509500696),(20,1398560000000)]
for stage, price in buy_prices:
    rc = reward_coins(stage) * 5  # 5次通关
    needed = price / 3
    print(f"{stage:>4} {rc:>15.0f}(×5) {needed:>18.0f} {'✓' if rc >= needed else '✗'}")
