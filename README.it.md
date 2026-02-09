# ComfyUI-Ex-TagComplete

[<img src="https://img.shields.io/badge/lang-Italiano-red.svg?style=plastic" height="25" />](README.it.md)
[<img src="https://img.shields.io/badge/lang-English-blue.svg?style=plastic" height="25" />](README.md)

![capture](https://files.catbox.moe/fv292m.webp)

Questa estensione è basata su [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts).

Inoltre, i seguenti file nella cartella tags:

- danbooru.csv
- danbooru_e621_merged.csv
- extra-quality-tags.csv

sono presi in prestito da [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete).

## Installazione
```
cd ComfyUI\custom_nodes
git clone https://github.com/huchukato/comfy-tagcomplete.git
```

## Impostazioni
![settings](https://files.catbox.moe/0ai9mj.png)

- `Enable`
  - Abilita la funzionalità
- `Main Tags file`
  - File CSV dei tag principali
  - Include **tutti i file CSV eccetto quelli che iniziano con 'extra'** nella cartella tags
- `Extra Tags file`
  - File CSV dei tag aggiuntivi
  - Include **solo i file CSV che iniziano con 'extra'** nella cartella tags
- `Translate file` ⭐new
  - Imposta un file di traduzione
- `Delimiter`
  - Carattere separatore dei tag
  - Scegli tra virgola (,), punto (.), o nessuno
- `Add 'Space' after separator`
  - Aggiungi uno spazio dopo il separatore
- `Insert Tag on Tab key`
  - Inserisci il tag con il tasto Tab
- `Insert Tag on Enter key`
  - Inserisci il tag con il tasto Enter
- `Max Suggestions to Display`
  - Numero di suggerimenti di tag da visualizzare
  - 0 mostra tutti ~~ma diventa lento (estremamente lento)~~
- `Add Wiki Link Button`
  - Aggiungi il pulsante link wiki (danbooru / e621) a sinistra dei suggerimenti dei tag
- `Replace '_' to 'Space'`
  - Sostituisci gli underscore nei tag con spazi
- `Completion delay(ms)`
  - Tempo prima di visualizzare i suggerimenti dei tag dopo l'input
- `Enable Embeddings`
  - Includi i file Embedding nei suggerimenti
- `Enable LoRAs`
  - Includi i file LoRA nei suggerimenti
- `Enable Wildcards` ⭐new
  - Includi le wildcard nei suggerimenti
- `Restrict Alias`
  - Quando attivo, gli Alias (come 1girls => 1girl) vengono visualizzati solo in caso di corrispondenza esatta
  - Per esempio, l'alias "1girls => 1girl" verrà visualizzato solo quando digiti fino a "1girls"

## Filtro Categoria
![filter](https://files.catbox.moe/bir330.png)

Puoi cercare specificando le categorie.  
Inserisci `--○○` per specificare una categoria.  
Le categorie disponibili sono elencate in [Category Map](category_map.csv).  
- Esempio
  - `--character fate`
    - Mostra solo i risultati con categoria `character` dai risultati di ricerca `fate`.

## Prefisso
![prefix](https://files.catbox.moe/uddq2d.png)

Puoi cercare con le impostazioni di prefisso.  
Inserisci `++○○` per impostare un prefisso.  
Puoi impostare più prefissi.  
- Esempio
  - `++pink skirt`
    - Quando cerchi "skirt" e selezioni `pleated skirt`, il risultato sarà `pink pleated skirt`.