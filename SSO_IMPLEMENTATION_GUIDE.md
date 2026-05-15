# SSO (Safety/Security Officer) Implementation Documentation

This document provides a comprehensive overview of the SSO-side implementation in the GreenCity AMC mobile application, including the UI structure, logic, and backend API endpoints.

## 1. Authentication Flow
The login process has been updated to support the SSO role alongside Employees and Managers.

- **Screen**: `LoginScreen.tsx`
- **Logic**: SSO officers login using their **Email** and **Password**.
- **Role Detection**: Upon successful login, the system identifies the user role as `sso` and redirects them to the SSO-specific dashboard.

## 2. UI Screens & Features
We have implemented three primary screens for the SSO role, designed with a premium, responsive interface.

### A. SSO Dashboard (`SsoDashboardScreen.tsx`)
- **Purpose**: High-level overview for officers.
- **Key Features**:
  - **Zone Information**: Displays the officer's assigned zone.
  - **Quick Actions**: "Generate CCR Ticket" and "View Ticket History" buttons.
  - **Incident Summary**: Visual cards showing recent safety activities.

### B. Safety (CCR) Ticket List (`SsoCcrListScreen.tsx`)
- **Purpose**: Manage and monitor existing safety reports.
- **Key Features**:
  - **Ticket Cards**: Displays title, type, priority, and current status.
  - **Filtering**: Ability to see 'Pending' vs 'Resolved' issues.
  - **Real-time Updates**: Fetches the latest tickets from the backend.

### C. Create Safety Ticket (`SsoCreateCcrScreen.tsx`)
- **Purpose**: Standardized form for reporting safety violations or incidents.
- **Key Features**:
  - **Form Fields**: Ticket Type, Title, Detailed Description, and Priority Level.
  - **Vehicle Integration**: Dropdown to link a ticket to a specific vehicle (fetched via API).
  - **Validation**: Ensures all mandatory fields are filled before submission.

## 3. Backend API Endpoints
All SSO functionalities are powered by the `ssoService.ts` module, which interacts with the following REST APIs:

| Feature | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| **Login** | `POST` | `/auth/login` | Shared login endpoint for SSO and Managers. |
| **Get Tickets** | `GET` | `/api/sso/ccr` | Retrieves all Safety (CCR) tickets for the officer's zone. |
| **Create Ticket** | `POST` | `/api/sso/ccr` | Submits a new safety report to the database. |
| **Get Vehicles**| `GET` | `/api/sso/vehicles`| Fetches list of vehicles to associate with a ticket. |

## 4. File Structure Reference
- **Screens**: `src/screens/SsoDashboardScreen.tsx`, `src/screens/SsoCcrListScreen.tsx`, `src/screens/SsoCreateCcrScreen.tsx`
- **Service**: `src/services/ssoService.ts`
- **Navigation**: `src/navigation/AppNavigator.tsx` (SSO routing logic)

---
*Note: Ensure the backend base URL in `src/services/api.ts` is correctly pointing to your production/staging server.*
