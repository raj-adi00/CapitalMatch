## Project Assumptions & Design Decisions

### Capital Call Uniqueness & Key Structure

* **Initial Design Thought**: Evaluated using `organization`, `call_date`, and `due_date` together as the unique constraint for the **`CapitalCall`** model.
* **Evaluation of Alternatives**: Acknowledged that multiple capital calls could theoretically share the same call and due dates within a single organization. While adding a separate explicit identifier field was considered, it would introduce unnecessary data complexity and redundancy.
* **Final Assumption**: Concluded that the combination of **`organization`**, **`call_date`**, and **`due_date`** serves as the practical and effective unique key for identifying each distinct **`CapitalCall`** for demo seeding.

### Seed demo data Command
* *To seed demo data*: `python manage.py seed_demo`

## Add Ons
* Pagination and filters
