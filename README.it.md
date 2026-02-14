# ComfyUI-TagComplete

[<img src="https://img.shields.io/badge/lang-Italiano-red.svg?style=plastic" height="25" />](README.it.md)
[<img src="https://img.shields.io/badge/lang-English-blue.svg?style=plastic" height="25" />](README.md)

![demo](https://imgur.com/MViHylT)

## 🎯 About

**ComfyUI-TagComplete** è un'estensione avanzata che porta il completamento tag professionale e la selezione opzioni wildcard a ComfyUI, ispirata dal rinomato a1111-sd-webui-tagcomplete. Progettata per artisti AI e ingegneri di prompt che richiedono precisione ed efficienza nel loro workflow.

### 🚀 Cosa Rende Speciale

- **🧠 Completamento Tag Intelligente**: Suggerimenti in tempo reale da database CSV completi (Danbooru, e621, tag personalizzati)
- **🎪 Selezione Opzioni Wildcard**: Workflow rivoluzionario in stile a1111 per la creazione di prompt complessi
- **🌐 Supporto Multi-Fonte**: Integra perfettamente wildcard da multiple posizioni ed estensioni
- **⚡ Performance Ottimizzate**: Leggero, veloce, e non rallenta la tua esperienza ComfyUI
- **🔧 Altamente Personalizzabile**: Impostazioni estese per adattare l'esperienza alle tue esigenze

### 🎨 Perfetto Per

- **Artisti AI** che vogliono semplificare il loro processo di creazione prompt
- **Ingegneri di Prompt** che necessitano controllo preciso sulle combinazioni di tag
- **Content Creator** che cercano coerenza tra le generazioni
- **Power User** che vogliono strumenti professionali nel loro workflow

### 🌟 Innovazione Chiave

La caratteristica di spicco è il **sistema di selezione opzioni wildcard** - digita `__`, seleziona una wildcard, e sfoglia istantaneamente le opzioni individuali con gestione intelligente del testo e overflow. Questo trasforma la creazione di prompt complessi da un compito in un processo creativo e intuitivo.

---

## ✨ Novità nella v2.0.0 - Selezione Opzioni Wildcard

Questa versione introduce la **selezione opzioni wildcard in stile a1111-sd-webui-tagcomplete**, rendendo l'uso delle wildcard più intuitivo e potente:

### 🎯 Flusso di Lavoro Wildcard
1. **Digita `__`** per vedere le wildcard disponibili
2. **Seleziona una wildcard** con i tasti freccia e premi **Invio** → inserisce `__nome_wildcard__`
3. **Auto-mostra opzioni** → visualizza immediatamente tutte le opzioni da quella wildcard
4. **Seleziona un'opzione** con i tasti freccia e premi **Invio** → sostituisce la wildcard con l'opzione scelta
5. **ESC** → mantiene la wildcard inserita e chiude le opzioni

### 🌟 Caratteristiche
- **Parsing intelligente**: Gestisce wildcard con percorsi complessi (es. `__mbe/blwjob/blwjb__`)
- **Opzioni riga per riga**: Ogni riga nel file wildcard diventa un'opzione separata
- **Gestione testo lungo**: Opzioni lunghe vengono troncate con espansione al passaggio del mouse
- **Compatibilità totale**: Funziona con file wildcard e formati esistenti
- **Fonti multiple**: Supporta wildcard da repository, ComfyUI/models, DynamicPrompts e Impact-Pack

### 📁 Fonti Wildcard (in ordine di priorità):
1. Cartella `wildcards/` del repository
2. ComfyUI `models/wildcards/`
3. DynamicPrompts `wildcards/`
4. Configurazione extra model paths
5. Wildcard Impact-Pack
6. Percorsi personalizzati Impact-Pack.ini

Questa estensione è basata su [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts).

I seguenti file nella cartella tags sono basati o ispirati da [a1111-sd-webui-tagcomplete](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete):

- danbooru.csv (aggiornato e pulito, tag deprecati rimossi a febbraio 2026)
- danbooru_e621_merged.csv
- extra-quality-tags.csv

Inoltre, questa estensione include la **funzionalità di selezione opzioni wildcard** ispirata da a1111-sd-webui-tagcomplete, permettendo agli utenti di selezionare opzioni individuali dai file wildcard con un flusso di lavoro intuitivo.

## Installazione
```
cd ComfyUI/custom_nodes
git clone https://github.com/huchukato/comfy-tagcomplete.git
```
### 📁 Setup Manuale Wildcard (Opzionale)

Se stai installando manualmente o vuoi usare le wildcards con Impact Pack, potresti dover copiare la cartella wildcards:

1. **Copia wildcards in Impact Pack:**
   ```bash
   cp -r /path/to/comfy-tagcomplete/wildcards /path/to/ComfyUI/custom_nodes/comfyui-impact-pack/wildcards/
   ````
2. **Riavvia ComfyUI per caricare le nuove wildcards**

**Nota:** L'estensione rileva automaticamente le wildcards da più fonti, ma la copia manuale assicura la massima compatibilità con Impact Pack e altre estensioni.

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