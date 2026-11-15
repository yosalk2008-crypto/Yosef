import re, json, os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','public')
os.makedirs(R+'/koscher/art',exist_ok=True); os.makedirs(R+'/halal/art',exist_ok=True)
def load(n):
    s=open(os.path.dirname(os.path.abspath(__file__))+'/game-art/'+n+'.svg').read()
    s=re.sub(r'<rect width="\d+" height="\d+" fill="#E5E5E5"/>\n','',s)
    return s
def groups(s):
    # top-level named groups inside the "Generated" group, in order
    inner=s[s.index('>',s.index('<g id="Generated'))+1:]
    inner=inner[:inner.rindex('</g>')]
    if '<defs>' in inner: inner=inner[:inner.index('</g>\n<defs>')] if '</g>\n<defs>' in inner else inner
    out=[];depth=0;cur=None;buf=[]
    for line in inner.split('\n'):
        if depth==0:
            m=re.match(r'<g id="([^"]+)"',line)
            if not m: continue
            cur=m.group(1);buf=[line];depth=1;continue
        buf.append(line)
        depth+=len(re.findall(r'<g[ >]',line))-line.count('</g>')
        if depth==0: out.append((cur,'\n'.join(buf)))
    return out
def clean(x):
    x=re.sub(r' id="Vector[^"]*"','',x)
    x=re.sub(r'<g id="([^"]+)"',r'<g class="\1"',x)
    return re.sub(r'\n+','',x)
def inline(n,vb,cls,post=None):
    g=''.join(clean(b) for _,b in groups(load(n)))
    if post: g=post(g)
    return f'<svg class="{cls}" viewBox="{vb}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">{g}</svg>'
def carpost(g):
    for cls in ('rear-wheel','front-wheel'):
        m=re.search(r'<g class="%s">(<path[^>]*/>)(.*?)</g>'%cls,g)
        g=g.replace(m.group(0),f'<g class="{cls}">{m.group(1)}<g class="spin">{m.group(2)}</g></g>')
    return g
art={'car':inline('car','66 84 510 226','kcar',carpost),'sack':inline('sack','100 50 310 410','ksack'),'chest':inline('chest','95 25 450 460','kchest')}
open(R+'/koscher/art.js','w').write('// Vektorgrafiken aus Figma (Datei "Koshertrivia – Spielgrafiken Koscher & Halal"), erzeugt von scripts – nicht von Hand ändern.\nwindow.KT_ART = '+json.dumps(art)+';\n')
c=''.join(clean(b) for _,b in groups(load('coin')))
open(R+'/koscher/art/coin.svg','w').write(f'<svg viewBox="20 22 216 216" fill="none" xmlns="http://www.w3.org/2000/svg">{c}</svg>')
G=dict(groups(load('land')))
def layer(names,name,tile=True,vb_h=400):
    body=''.join(clean(G[k]) for k in names)
    if tile: svg=f'<svg viewBox="0 0 3200 {vb_h}" width="3200" height="{vb_h}" fill="none" xmlns="http://www.w3.org/2000/svg"><g>{body}</g><g transform="translate(3200,0) scale(-1,1)">{body}</g></svg>'
    else: svg=f'<svg viewBox="0 0 1600 {vb_h}" width="1600" height="{vb_h}" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">{body}</svg>'
    open(R+f'/halal/art/{name}.svg','w').write(svg)
layer(['sunset-sky','level-horizon'],'sky',False)
layer(['soft-clouds'],'clouds')
layer(['distant-sand-dunes'],'dunes')
layer(['distant-green-hills','far-house-left','far-house-center','far-house-right','middle-meadow','distant-palm','olive-tree-left-middle','olive-tree-right-middle'],'mid')
layer(['palm-left','palm-right','small-palm-left','foreground-ground','foreground-olive-left','foreground-olive-right','meadow-details'],'front')
print({k:len(v) for k,v in art.items()}, list(G))
