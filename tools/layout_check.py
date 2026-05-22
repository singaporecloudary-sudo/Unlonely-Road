"""验证最终布局：confirm 按钮顶部在 +N 底部下方至少6px，按钮底不溢出 panel 也不溢出屏幕"""
W, H = 720, 1280

def calc(isWin, ratio):
    panelW = W * 0.80
    panelH = panelW * ratio
    py = max(40, (H - panelH) / 2)
    title_y = py + panelH * 0.17
    star_y = py + panelH * 0.30
    line0_y = py + panelH * (0.42 if isWin else 0.38)
    line2_y = line0_y + panelH * 0.07 * 2
    reward_y = py + panelH * (0.71)  # win 用切图自带, fail 用 0.71 自补
    cardCY = py + panelH * 0.78
    cardSize = panelW * 0.085
    plusY = cardCY + cardSize / 2 + panelW * 0.003
    plusH = panelW * 0.032
    plusBot = plusY + plusH
    btnW = panelW * (0.62 if isWin else 0.40)
    btnH = btnW * (117/425) if isWin else btnW * (164/428)
    btn_top = py + panelH * 0.92 - btnH / 2
    btn_bot = btn_top + btnH
    pBot = py + panelH
    print(f"\n{'win' if isWin else 'fail'} ratio={ratio:.3f} panelW={panelW:.0f} panelH={panelH:.0f}")
    print(f"  panel y=[{py:.0f},{pBot:.0f}]")
    print(f"  title={title_y:.0f}, line0={line0_y:.0f}, line2={line2_y:.0f}, reward={reward_y:.0f}")
    print(f"  card y=[{cardCY-cardSize/2:.0f},{cardCY+cardSize/2:.0f}]  +N y=[{plusY:.0f},{plusBot:.0f}]")
    print(f"  btn y=[{btn_top:.0f},{btn_bot:.0f}]  size={btnW:.0f}x{btnH:.0f}")
    print(f"  距panel底={pBot - btn_bot:.0f}px, 距屏幕底={H - btn_bot:.0f}px")
    if line2_y + 20 > reward_y:
        print(f"  !! line2 太靠近 reward")
    if btn_bot > pBot:
        print(f"  !! 按钮溢出 panel")

calc(True, 777/613)
calc(False, 739/550)

