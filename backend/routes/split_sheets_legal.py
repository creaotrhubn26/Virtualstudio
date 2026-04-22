"""Split-sheet legal document generation API — extracted from backend/main.py.

Generates Markdown-formatted legal contracts (split-sheet agreement / royalty
agreement / collaboration agreement / custom) from split-sheet + contributor
data, persists them to ``split_sheet_contracts``, and lists them back.

The template dictionaries and ``generate_legal_document_content`` helper
are module-level constants/functions here; they were previously inline at
the top of the legal-documents section in main.py.
"""

import json
import uuid
from datetime import datetime

import psycopg2
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

router = APIRouter(
    prefix="/api/split-sheets/{split_sheet_id}/legal-documents",
    tags=["split_sheets_legal"],
)


def _db_or_503_response():
    try:
        from tutorials_service import get_db_connection
    except ImportError:
        return None, JSONResponse(
            {"success": False, "error": "Database service not available"},
            status_code=503,
        )
    return get_db_connection(), None


_CREATE_CONTRACTS_SQL = """
CREATE TABLE IF NOT EXISTS split_sheet_contracts (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255),
    split_sheet_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    parties JSONB DEFAULT '[]',
    obligations JSONB DEFAULT '[]',
    payment_terms JSONB DEFAULT '[]',
    legal_references JSONB DEFAULT '[]',
    applied_suggestions JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'draft',
    signature_status VARCHAR(50) DEFAULT 'unsigned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""

LEGAL_DOCUMENT_TEMPLATES = {
    "split_sheet_agreement": {
        "title_no": "SPLIT SHEET-AVTALE",
        "title_en": "SPLIT SHEET AGREEMENT",
        "sections": [
            "parties", "work_description", "ownership_splits",
            "royalty_distribution", "credits",
        ],
    },
    "royalty_agreement": {
        "title_no": "ROYALTY-AVTALE",
        "title_en": "ROYALTY AGREEMENT",
        "sections": [
            "parties", "royalty_terms", "payment_schedule",
            "reporting", "audit_rights",
        ],
    },
    "collaboration_agreement": {
        "title_no": "SAMARBEIDSAVTALE",
        "title_en": "COLLABORATION AGREEMENT",
        "sections": [
            "parties", "scope_of_work", "responsibilities",
            "ownership", "revenue_sharing", "term_termination",
        ],
    },
    "custom": {
        "title_no": "AVTALE",
        "title_en": "AGREEMENT",
        "sections": ["parties", "terms"],
    },
}

CLAUSE_TEMPLATES = {
    "dispute_resolution": {
        "no": """
## Tvisteløsning

Enhver tvist som oppstår i forbindelse med denne avtalen skal først søkes løst gjennom forhandlinger
mellom partene. Dersom partene ikke kommer til enighet innen 30 dager, skal tvisten avgjøres ved
{arbitration_body} i henhold til gjeldende regler.""",
        "en": """
## Dispute Resolution

Any dispute arising in connection with this agreement shall first be sought resolved through negotiations
between the parties. If the parties fail to reach an agreement within 30 days, the dispute shall be
settled by {arbitration_body} in accordance with applicable rules.""",
    },
    "termination": {
        "no": """
## Oppsigelse

Denne avtalen kan sies opp av hver av partene med {notice_period} dagers skriftlig varsel. Ved oppsigelse
skal alle utestående forpliktelser gjøres opp, og partenes rettigheter i henhold til avtalen skal bestå
for allerede skapte verk.""",
        "en": """
## Termination

This agreement may be terminated by either party with {notice_period} days written notice. Upon termination,
all outstanding obligations shall be settled, and the parties' rights under the agreement shall continue
for works already created.""",
    },
    "assignment": {
        "no": """
## Overføring av rettigheter

Ingen av partene kan overdra eller overføre sine rettigheter eller forpliktelser etter denne avtalen til
en tredjepart uten skriftlig samtykke fra den andre parten. Slikt samtykke skal ikke nektes uten
rimelig grunn.""",
        "en": """
## Assignment of Rights

Neither party may assign or transfer its rights or obligations under this agreement to a third party
without the written consent of the other party. Such consent shall not be unreasonably withheld.""",
    },
    "governing_law": {
        "norway": {
            "no": "Denne avtalen er underlagt norsk rett. Oslo tingrett er avtalt verneting for tvister som ikke løses i minnelighet.",
            "en": "This agreement is governed by Norwegian law. Oslo District Court is the agreed venue for disputes not resolved amicably.",
        },
        "sweden": {
            "no": "Denne avtalen er underlagt svensk rett. Stockholms tingsrätt er avtalt verneting.",
            "en": "This agreement is governed by Swedish law. Stockholm District Court is the agreed venue.",
        },
        "denmark": {
            "no": "Denne avtalen er underlagt dansk rett. Københavns Byret er avtalt verneting.",
            "en": "This agreement is governed by Danish law. Copenhagen City Court is the agreed venue.",
        },
        "uk": {
            "no": "Denne avtalen er underlagt engelsk rett. Engelske domstoler har eksklusiv jurisdiksjon.",
            "en": "This agreement is governed by English law. English courts have exclusive jurisdiction.",
        },
        "us": {
            "no": "Denne avtalen er underlagt lovene i staten New York, USA. Føderale og statlige domstoler i New York har eksklusiv jurisdiksjon.",
            "en": "This agreement is governed by the laws of the State of New York, USA. Federal and state courts in New York have exclusive jurisdiction.",
        },
    },
}


def generate_legal_document_content(
    split_sheet: dict,
    contributors: list,
    document_type: str,
    include_clauses: dict,
    governing_law: str,
    custom_clauses: str,
    language: str = "no",
) -> str:
    """Generate legal document content from split sheet data (Markdown)."""
    template = LEGAL_DOCUMENT_TEMPLATES.get(
        document_type, LEGAL_DOCUMENT_TEMPLATES["custom"]
    )
    title = template.get(f"title_{language}", template["title_no"])

    content = f"""# {title}

**Dato:** {datetime.now().strftime('%d.%m.%Y')}
**Referanse:** {split_sheet.get('id', 'N/A')[:8]}

---

## 1. Parter

Denne avtalen («Avtalen») inngås mellom følgende parter:

"""

    for i, contributor in enumerate(contributors, 1):
        role_display = contributor.get("role", "Bidragsyter").replace("_", " ").title()
        content += (
            f"**Part {i}:**\n"
            f"- Navn: {contributor.get('name', 'Ikke oppgitt')}\n"
            f"- E-post: {contributor.get('email', 'Ikke oppgitt')}\n"
            f"- Rolle: {role_display}\n"
            f"- Andel: {contributor.get('percentage', 0)}%\n\n"
        )

    content += (
        "---\n\n"
        "## 2. Verket\n\n"
        "Denne avtalen gjelder følgende verk:\n\n"
        f"- **Tittel:** {split_sheet.get('title', 'Ikke oppgitt')}\n"
        f"- **Beskrivelse:** {split_sheet.get('description', 'Ingen beskrivelse')}\n"
        f"- **Status:** {split_sheet.get('status', 'draft')}\n\n"
        "---\n\n"
        "## 3. Eierandeler og Fordeling\n\n"
        "Partene er enige om følgende fordeling av rettigheter og inntekter:\n\n"
        "| Part | Rolle | Andel |\n"
        "|------|-------|-------|\n"
    )

    total = 0
    for contributor in contributors:
        pct = contributor.get("percentage", 0)
        total += pct
        role = contributor.get("role", "Bidragsyter").replace("_", " ").title()
        content += f"| {contributor.get('name', 'Ukjent')} | {role} | {pct}% |\n"
    content += f"| **Totalt** | | **{total}%** |\n\n"

    if document_type == "royalty_agreement":
        content += (
            "---\n\n"
            "## 4. Royalty-vilkår\n\n"
            "Royalties skal beregnes og utbetales i henhold til følgende:\n\n"
            "- **Beregningsgrunnlag:** Netto inntekter etter fradrag for dokumenterte kostnader\n"
            "- **Utbetalingsfrekvens:** Kvartalsvis\n"
            "- **Rapportering:** Detaljert regnskap skal leveres sammen med hver utbetaling\n"
            "- **Revisjonsrett:** Hver part har rett til å kreve revisjon av regnskapet med 30 dagers varsel\n\n"
        )
    elif document_type == "collaboration_agreement":
        content += (
            "---\n\n"
            "## 4. Samarbeidsvilkår\n\n"
            "Partene forplikter seg til:\n\n"
            "- Å samarbeide i god tro for å fullføre verket\n"
            "- Å informere hverandre om forhold som kan påvirke prosjektet\n"
            "- Å respektere avtalte frister og leveranser\n"
            "- Å kreditere alle bidragsytere i henhold til denne avtalen\n\n"
        )

    clause_num = 5 if document_type in ("royalty_agreement", "collaboration_agreement") else 4

    if include_clauses.get("dispute_resolution", False):
        clause_content = CLAUSE_TEMPLATES["dispute_resolution"][language]
        clause_content = clause_content.replace(
            "{arbitration_body}",
            "voldgiftsdomstol" if language == "no" else "arbitration tribunal",
        )
        content += (
            f"\n---\n\n## {clause_num}. "
            + clause_content.strip().replace("## ", "")
            + "\n"
        )
        clause_num += 1
    if include_clauses.get("termination", False):
        clause_content = CLAUSE_TEMPLATES["termination"][language]
        clause_content = clause_content.replace("{notice_period}", "30")
        content += (
            f"\n---\n\n## {clause_num}. "
            + clause_content.strip().replace("## ", "")
            + "\n"
        )
        clause_num += 1
    if include_clauses.get("assignment", False):
        clause_content = CLAUSE_TEMPLATES["assignment"][language]
        content += (
            f"\n---\n\n## {clause_num}. "
            + clause_content.strip().replace("## ", "")
            + "\n"
        )
        clause_num += 1
    if include_clauses.get("governing_law", False):
        law_templates = CLAUSE_TEMPLATES["governing_law"].get(
            governing_law, CLAUSE_TEMPLATES["governing_law"]["norway"]
        )
        content += (
            f"\n---\n\n## {clause_num}. Gjeldende lov\n\n{law_templates[language]}\n"
        )
        clause_num += 1

    if custom_clauses and custom_clauses.strip():
        content += f"\n---\n\n## {clause_num}. Tilleggsvilkår\n\n{custom_clauses.strip()}\n"
        clause_num += 1

    content += (
        f"\n---\n\n"
        f"## {clause_num}. Signaturer\n\n"
        "Ved å signere denne avtalen bekrefter partene at de har lest, forstått og akseptert alle vilkår.\n\n"
    )
    for contributor in contributors:
        content += (
            f"\n**{contributor.get('name', 'Part')}**\n\n"
            "Signatur: ____________________________\n\n"
            "Dato: ____________________________\n\n"
        )

    content += (
        "\n---\n\n"
        "*Dette dokumentet er generert automatisk basert på split sheet-data. "
        "Det anbefales å få dokumentet gjennomgått av en jurist før signering.*\n"
    )
    return content


@router.post("/generate")
async def generate_legal_document(split_sheet_id: str, request: Request):
    """Generate a legal document and persist it as a draft contract."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        body = await request.json()
        document_type = body.get("document_type", "split_sheet_agreement")
        include_clauses = body.get("include_clauses", {})
        governing_law = body.get("governing_law", "norway")
        custom_clauses = body.get("custom_clauses", "")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(_CREATE_CONTRACTS_SQL)
            conn.commit()

            cur.execute("SELECT * FROM split_sheets WHERE id = %s", (split_sheet_id,))
            split_sheet = cur.fetchone()
            if not split_sheet:
                return JSONResponse(
                    {"success": False, "error": "Split sheet not found"},
                    status_code=404,
                )
            split_sheet = dict(split_sheet)

            cur.execute(
                "SELECT * FROM split_sheet_contributors "
                "WHERE split_sheet_id = %s "
                "ORDER BY order_index, created_at",
                (split_sheet_id,),
            )
            contributors = [dict(r) for r in cur.fetchall()]

            content = generate_legal_document_content(
                split_sheet=split_sheet,
                contributors=contributors,
                document_type=document_type,
                include_clauses=include_clauses,
                governing_law=governing_law,
                custom_clauses=custom_clauses,
                language="no",
            )

            contract_id = str(uuid.uuid4())
            document_title = LEGAL_DOCUMENT_TEMPLATES.get(document_type, {}).get(
                "title_no", "Avtale"
            )
            full_title = f"{document_title} - {split_sheet.get('title', 'Untitled')}"

            cur.execute(
                """
                INSERT INTO split_sheet_contracts
                (id, split_sheet_id, title, content, parties, obligations,
                 payment_terms, legal_references, applied_suggestions, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    contract_id,
                    split_sheet_id,
                    full_title,
                    content,
                    json.dumps(
                        [
                            {
                                "id": c.get("id"),
                                "name": c.get("name"),
                                "email": c.get("email"),
                                "role": c.get("role"),
                            }
                            for c in contributors
                        ]
                    ),
                    json.dumps([]),
                    json.dumps([]),
                    json.dumps([]),
                    json.dumps([]),
                    "draft",
                ),
            )
            contract_row = cur.fetchone()
            conn.commit()

            contract = dict(contract_row) if contract_row else {}
            for k, v in contract.items():
                if hasattr(v, "isoformat"):
                    contract[k] = v.isoformat()

            return JSONResponse(
                {
                    "success": True,
                    "data": {
                        "contract": contract,
                        "documentContent": content,
                        "documentType": document_type,
                        "splitSheet": {
                            "id": split_sheet.get("id"),
                            "title": split_sheet.get("title"),
                        },
                        "contributorCount": len(contributors),
                    },
                }
            )
    except psycopg2.Error as e:
        conn.rollback()
        return JSONResponse(
            {"success": False, "error": f"Database error: {e}"}, status_code=500
        )
    finally:
        conn.close()


@router.get("")
async def get_legal_documents(split_sheet_id: str):
    """Get all legal documents (contracts) for a split sheet."""
    conn, err = _db_or_503_response()
    if err:
        return err
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM split_sheet_contracts "
                "WHERE split_sheet_id = %s ORDER BY created_at DESC",
                (split_sheet_id,),
            )
            documents = []
            for row in cur.fetchall():
                doc = dict(row)
                for k, v in doc.items():
                    if hasattr(v, "isoformat"):
                        doc[k] = v.isoformat()
                documents.append(doc)
            return JSONResponse({"success": True, "data": documents})
    except psycopg2.Error as e:
        return JSONResponse(
            {"success": False, "error": f"Database error: {e}"}, status_code=500
        )
    finally:
        conn.close()
