#!/usr/bin/env python3
import csv

def clean_obsolete_tags():
    # Leggi i tag validi dal file di riferimento (2 colonne)
    valid_tags = set()
    with open('tags/danbooru_01_26.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 1 and row[0].strip():
                valid_tags.add(row[0].strip())
    
    print(f"Tag validi trovati: {len(valid_tags)}")
    
    # Filtra il file principale mantenendo solo i tag validi (4 colonne)
    cleaned_rows = []
    removed_count = 0
    
    with open('tags/danbooru.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 1 and row[0].strip():
                tag = row[0].strip()
                if tag in valid_tags:
                    cleaned_rows.append(row)
                else:
                    removed_count += 1
    
    print(f"Tag rimossi: {removed_count}")
    print(f"Tag mantenuti: {len(cleaned_rows)}")
    
    # Scrivi il file pulito
    with open('tags/danbooru.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(cleaned_rows)
    
    print("File danbooru.csv aggiornato!")

if __name__ == "__main__":
    clean_obsolete_tags()
