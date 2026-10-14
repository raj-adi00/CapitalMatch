# Assessment Notes

## Setup from Fresh Clone

Follow these steps to set up and run the application from a fresh clone:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/raj-adi00/CapitalMatch
   cd CapitalMatch
   ```

2. **Backend Setup**:

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

3. **Frontend Setup**:
```bash
cd frontend
npm install
npm run dev
```

4. **Run tests**:
```bash
python manage.py test
```

## Environment Variables(.env.example)
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## App Name, Data Model & API Endpoints

### App Name
* **`reconciliation`**

### Data Model Brief
* **`Organization`**: Represents the GP entity, storing the organization name and unique slug.
* **`CapitalCall`**: Represents a capital call notice issued by an GP.
* **`LineItem`**: Specific investor commitments tied to a capital call, tracking called amounts, funded balances, and expected references.
* **`Transaction`**: Ingested bank statement records tracking dates, descriptions, amounts, types (`credit`/`debit`), and workflow statuses (`needs_review`, `suggested`, `reconciled`, `ignored`).
* **`Match`**: Represents proposed, approved, or rejected links connecting incoming bank transactions to capital call line items, complete with reasoning.

### API Endpoints Brief
* **`GET /api/organizations/`**: Retrieves the list of available organizations for selection.
* **`POST /api/upload/`**: Handles multi-tenant CSV statement uploads and parses row entries.
* **`GET /api/transactions/`**: Lists transactions with integrated pagination and status filters.
* **`GET /api/line-items/`**: Fetches capital call line items for the active tenant.
* **`POST /api/matches/<mathc_id>/approve/`**: Manually approves a proposed match, updates line item balances, and marks the transaction as reconciled.
* **`POST /api/matches/<match_id>/reject/`**: Rejects a proposed match and updates transaction states accordingly.


## Project Assumptions & Design Decisions

### Capital Call Uniqueness & Key Structure

* **Initial Design Thought**: Evaluated using `organization`, `call_date`, and `due_date` together as the unique constraint for the **`CapitalCall`** model.

* **Evaluation of Alternatives**: Acknowledged that multiple capital calls could theoretically share the same call and due dates within a single organization. While adding a separate explicit identifier field was considered, it would introduce unnecessary data complexity and redundancy.

* **Final Assumption**: Concluded that the combination of **`organization`**, **`call_date`**, and **`due_date`** serves as the practical and effective unique key for identifying each distinct **`CapitalCall`** for demo seeding.

### Seed demo data Command
* *To seed demo data*: `python manage.py seed_demo`

## Add Ons
* Pagination and filters

# I completed this assessment without using AI assistance.