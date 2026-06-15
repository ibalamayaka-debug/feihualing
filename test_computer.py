import urllib.request
import urllib.parse
import json

url = 'https://feihualing.ibalamayaka.workers.dev/api/poem?action=computer&keyword=' + urllib.parse.quote('春')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode("utf-8"))
except Exception as e:
    print(f'Error {e}')
