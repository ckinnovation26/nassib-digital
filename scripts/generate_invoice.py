#!/usr/bin/env python3
"""
Générateur de facture PDF pour l'application Nassib Digital
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime
import os

# Taux de conversion
EUR_TO_KMF = 491.96775

def format_currency(amount_eur):
    """Formate le montant en EUR et KMF"""
    amount_kmf = amount_eur * EUR_TO_KMF
    return f"{amount_eur:,.2f} €", f"{amount_kmf:,.0f} KMF"

def create_invoice():
    # Configuration du document
    filename = "/app/facture_nassib_digital.pdf"
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#E11D48'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_CENTER
    )
    
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=20,
        spaceAfter=10
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#334155')
    )
    
    # Contenu
    elements = []
    
    # En-tête
    elements.append(Paragraph("FACTURE", title_style))
    elements.append(Paragraph("Application de Gestion de Restaurant", header_style))
    elements.append(Spacer(1, 20))
    
    # Informations facture
    invoice_date = datetime.now().strftime("%d/%m/%Y")
    invoice_number = f"FAC-{datetime.now().strftime('%Y%m%d')}-001"
    
    info_data = [
        ["N° Facture:", invoice_number, "Date:", invoice_date],
        ["Référence:", "NASSIB-DIGITAL-2026", "Échéance:", "30 jours"],
    ]
    
    info_table = Table(info_data, colWidths=[3*cm, 5*cm, 3*cm, 5*cm])
    info_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748B')),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#64748B')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Vendeur et Client
    parties_data = [
        [
            Paragraph("<b>VENDEUR</b><br/><br/>Nassib Digital<br/>Services de développement logiciel<br/>contact@nassib-digital.com", normal_style),
            Paragraph("<b>CLIENT</b><br/><br/>Restaurant Nassib<br/>Chaîne de restauration<br/>Comores<br/>administration@nassib.com", normal_style)
        ]
    ]
    
    parties_table = Table(parties_data, colWidths=[8*cm, 8*cm])
    parties_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#FFF7ED')),
        ('BOX', (0, 0), (0, 0), 1, colors.HexColor('#E2E8F0')),
        ('BOX', (1, 0), (1, 0), 1, colors.HexColor('#FDBA74')),
        ('PADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(parties_table)
    elements.append(Spacer(1, 30))
    
    # Titre détails
    elements.append(Paragraph("DÉTAIL DE LA PRESTATION", section_style))
    
    # Lignes de facturation
    items = [
        ("Développement Application Web Full-Stack", "Forfait", 1, 4500.00),
        ("- Frontend React + Tailwind CSS + Shadcn UI", "", 0, 0),
        ("- Backend FastAPI + MongoDB", "", 0, 0),
        ("- Authentification JWT multi-rôles", "", 0, 0),
        ("Dashboard Serveur (prise de commande)", "Inclus", 1, 800.00),
        ("Dashboard Cuisine (timer préparation)", "Inclus", 1, 600.00),
        ("Dashboard Comptabilité (statistiques)", "Inclus", 1, 500.00),
        ("Dashboard Administration (CRUD complet)", "Inclus", 1, 900.00),
        ("Intégration Paiement Stripe", "Module", 1, 700.00),
        ("Paiement Cash avec conversion KMF/EUR", "Module", 1, 300.00),
        ("Recherche instantanée menu", "Fonctionnalité", 1, 200.00),
        ("Interface multilingue (Français)", "Inclus", 1, 0),
        ("Design UI/UX personnalisé", "Forfait", 1, 500.00),
    ]
    
    # Calcul des totaux
    subtotal = sum(item[3] for item in items)
    tva_rate = 0.20  # 20% TVA
    tva = subtotal * tva_rate
    total = subtotal + tva
    
    # Tableau des prestations
    table_data = [
        ["Description", "Type", "Qté", "Prix EUR", "Prix KMF"]
    ]
    
    for desc, type_item, qty, price in items:
        if price > 0:
            eur, kmf = format_currency(price)
            table_data.append([desc, type_item, str(qty), eur, kmf])
        else:
            table_data.append([desc, type_item, "", "", ""])
    
    # Lignes de total
    table_data.append(["", "", "", "", ""])
    eur_sub, kmf_sub = format_currency(subtotal)
    table_data.append(["", "", "", "Sous-total HT:", eur_sub])
    table_data.append(["", "", "", f"", f"{kmf_sub}"])
    
    eur_tva, kmf_tva = format_currency(tva)
    table_data.append(["", "", "", "TVA (20%):", eur_tva])
    table_data.append(["", "", "", "", f"{kmf_tva}"])
    
    eur_total, kmf_total = format_currency(total)
    table_data.append(["", "", "", "TOTAL TTC:", eur_total])
    table_data.append(["", "", "", "", f"{kmf_total}"])
    
    # Style du tableau
    col_widths = [7*cm, 2.5*cm, 1.5*cm, 2.5*cm, 3*cm]
    main_table = Table(table_data, colWidths=col_widths)
    
    table_style = TableStyle([
        # En-tête
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Corps
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        
        # Alignement
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        
        # Bordures
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#E11D48')),
        ('LINEBELOW', (0, 1), (-1, -8), 0.5, colors.HexColor('#E2E8F0')),
        
        # Totaux
        ('FONTNAME', (3, -6), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (3, -2), (-1, -1), colors.HexColor('#FEF2F2')),
        ('TEXTCOLOR', (3, -2), (-1, -1), colors.HexColor('#E11D48')),
        ('FONTSIZE', (3, -2), (-1, -1), 11),
        
        # Lignes sous-détails (indentation visuelle)
        ('TEXTCOLOR', (0, 2), (0, 4), colors.HexColor('#64748B')),
        ('LEFTPADDING', (0, 2), (0, 4), 20),
    ])
    
    # Alterner les couleurs des lignes
    for i in range(1, len(table_data) - 6):
        if i % 2 == 0:
            table_style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F8FAFC'))
    
    main_table.setStyle(table_style)
    elements.append(main_table)
    elements.append(Spacer(1, 30))
    
    # Récapitulatif en gros
    recap_style = ParagraphStyle(
        'Recap',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#1E293B'),
        alignment=TA_CENTER,
        spaceBefore=10
    )
    
    elements.append(Paragraph(f"<b>MONTANT TOTAL À PAYER</b>", recap_style))
    
    total_box_data = [[
        Paragraph(f"<font size='18' color='#E11D48'><b>{eur_total}</b></font>", 
                  ParagraphStyle('tot', alignment=TA_CENTER)),
        Paragraph(f"<font size='14' color='#64748B'>soit</font>", 
                  ParagraphStyle('tot', alignment=TA_CENTER)),
        Paragraph(f"<font size='18' color='#F59E0B'><b>{kmf_total}</b></font>", 
                  ParagraphStyle('tot', alignment=TA_CENTER))
    ]]
    
    total_box = Table(total_box_data, colWidths=[5.5*cm, 2*cm, 5.5*cm])
    total_box.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFBEB')),
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#F59E0B')),
        ('PADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(Spacer(1, 10))
    elements.append(total_box)
    elements.append(Spacer(1, 30))
    
    # Conditions de paiement
    elements.append(Paragraph("CONDITIONS DE PAIEMENT", section_style))
    
    conditions = """
    <b>Modalités :</b> Paiement à 30 jours à réception de facture<br/>
    <b>Moyens acceptés :</b> Virement bancaire, Carte bancaire, Mobile Money<br/>
    <b>Taux de conversion appliqué :</b> 1 EUR = 491,96775 KMF<br/><br/>
    <b>Coordonnées bancaires :</b><br/>
    IBAN : FR76 XXXX XXXX XXXX XXXX XXXX XXX<br/>
    BIC : XXXXXXXX
    """
    elements.append(Paragraph(conditions, normal_style))
    elements.append(Spacer(1, 20))
    
    # Fonctionnalités incluses
    elements.append(Paragraph("FONCTIONNALITÉS LIVRÉES", section_style))
    
    features = """
    ✓ Application web responsive (PC, tablette, mobile)<br/>
    ✓ 4 interfaces métier : Serveur, Cuisine, Comptabilité, Administration<br/>
    ✓ Gestion complète du menu avec temps de préparation<br/>
    ✓ Gestion des tables et de leur disponibilité<br/>
    ✓ Gestion des utilisateurs avec rôles<br/>
    ✓ Prise de commande avec recherche instantanée<br/>
    ✓ Timer de préparation en cuisine<br/>
    ✓ Double système de paiement (Espèces KMF + Carte EUR via Stripe)<br/>
    ✓ Statistiques et tableau de bord comptable<br/>
    ✓ Interface entièrement en français<br/>
    ✓ Code source complet et documentation
    """
    elements.append(Paragraph(features, normal_style))
    elements.append(Spacer(1, 30))
    
    # Pied de page
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94A3B8'),
        alignment=TA_CENTER
    )
    
    elements.append(Paragraph(
        f"Facture générée le {invoice_date} | Nassib Digital - Application de gestion de restaurant",
        footer_style
    ))
    
    # Génération du PDF
    doc.build(elements)
    print(f"✅ Facture générée : {filename}")
    return filename

if __name__ == "__main__":
    create_invoice()
