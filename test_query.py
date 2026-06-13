import urllib.request
import urllib.parse
import json

def check(s):
    url = 'https://feihualing.ibalamayaka.workers.dev/api/poem?action=check&sentence=' + urllib.parse.quote(s)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        res = urllib.request.urlopen(req)
        print(f'{s}: {res.read().decode("utf-8")}')
    except Exception as e:
        print(f'{s}: Error {e}')

check('春眠不觉晓')
check('春眠不覺曉')
check('床前明月光')
check('白日依山尽')
