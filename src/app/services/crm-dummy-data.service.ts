import { Injectable, signal, computed } from '@angular/core';

export interface CrmContact {
  id: number; firstName: string; lastName: string; email: string;
  phone: string; company: string; jobTitle: string; type: 'Lead' | 'Customer' | 'Vendor';
  source: string; city: string; assignedTo: string; createdOn: string; tags: string[];
}
export interface CrmLead {
  id: number; title: string; contact: string; company: string; email: string;
  phone: string; status: 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted';
  source: string; value: number; priority: 'Low' | 'Medium' | 'High';
  assignedTo: string; expectedClose: string; createdOn: string; tags: string[];
}
export interface CrmDeal {
  id: number; title: string; contact: string; company: string;
  stage: string; stageOrder: number; value: number; probability: number;
  assignedTo: string; expectedClose: string; status: 'Open' | 'Won' | 'Lost';
  createdOn: string; color: string;
  priority?: 'Hot' | 'Warm' | 'Cold';
  lastActivityDate?: string;
  lostReason?: string;
}
export interface CrmActivity {
  id: number;
  type: string; // Call, Meeting, Email, Task, Note
  subject: string;
  linkedTo?: string; // Contact or Deal name
  linkedType?: 'Contact' | 'Deal' | 'Lead' | 'General';
  dealId?: number;
  assignedTo: string;
  dueDate: string;
  status: 'Pending' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  description?: string;
}

export interface CrmCampaign {
  id: number;
  name: string;
  type: 'Email' | 'WhatsApp' | 'Social';
  status: 'Draft' | 'Scheduled' | 'Active' | 'Completed';
  targetAudience: string;
  sendDate: string;
  sentCount: number;
  openRate: number; // percentage
  clickRate: number; // percentage
}

export interface PipelineStage {
  id: number; name: string; order: number; color: string; probability: number;
  deals: CrmDeal[];
}

@Injectable({ providedIn: 'root' })
export class CrmDummyDataService {

  readonly currentUser = {
    name: 'Priyank', role: 'Admin', avatar: 'RM',
    company: 'TechNova Solutions', email: 'rohan@technova.in'
  };

  readonly contacts: CrmContact[] = [
    { id: 1, firstName: 'Priyank', lastName: 'Sharma', email: 'priya.sharma@infosys.com', phone: '9876543210', company: 'Infosys Ltd', jobTitle: 'IT Manager', type: 'Customer', source: 'Referral', city: 'Bengaluru', assignedTo: 'Rohan Mehta', createdOn: '2026-04-10', tags: ['enterprise', 'priority'] },
    { id: 2, firstName: 'Amit', lastName: 'Verma', email: 'amit.v@tcs.com', phone: '9988776655', company: 'TCS', jobTitle: 'Procurement Head', type: 'Customer', source: 'Website', city: 'Mumbai', assignedTo: 'Sneha Iyer', createdOn: '2026-04-15', tags: ['hot'] },
    { id: 3, firstName: 'Deepika', lastName: 'Nair', email: 'd.nair@wipro.com', phone: '9123456789', company: 'Wipro', jobTitle: 'Operations Director', type: 'Lead', source: 'Cold Call', city: 'Hyderabad', assignedTo: 'Rohan Mehta', createdOn: '2026-04-20', tags: ['warm'] },
    { id: 4, firstName: 'Suresh', lastName: 'Patel', email: 'suresh@techcorp.in', phone: '9012345678', company: 'TechCorp India', jobTitle: 'CEO', type: 'Lead', source: 'Campaign', city: 'Ahmedabad', assignedTo: 'Karan Shah', createdOn: '2026-04-25', tags: ['enterprise'] },
    { id: 5, firstName: 'Ananya', lastName: 'Singh', email: 'ananya.s@hcl.com', phone: '9765432100', company: 'HCL Technologies', jobTitle: 'VP Sales', type: 'Customer', source: 'LinkedIn', city: 'Noida', assignedTo: 'Sneha Iyer', createdOn: '2026-05-01', tags: ['key-account'] },
    { id: 6, firstName: 'Rajesh', lastName: 'Kumar', email: 'raj.k@reliance.com', phone: '9654321098', company: 'Reliance Digital', jobTitle: 'Store Manager', type: 'Vendor', source: 'Referral', city: 'Mumbai', assignedTo: 'Rohan Mehta', createdOn: '2026-05-05', tags: [] },
    { id: 7, firstName: 'Meera', lastName: 'Joshi', email: 'meera@startupx.io', phone: '9543210987', company: 'StartupX', jobTitle: 'Founder', type: 'Lead', source: 'Website', city: 'Pune', assignedTo: 'Karan Shah', createdOn: '2026-05-08', tags: ['startup', 'warm'] },
    { id: 8, firstName: 'Vikram', lastName: 'Bose', email: 'vikram.b@adani.com', phone: '9432109876', company: 'Adani Group', jobTitle: 'IT Director', type: 'Lead', source: 'Cold Call', city: 'Ahmedabad', assignedTo: 'Rohan Mehta', createdOn: '2026-05-10', tags: ['enterprise', 'cold'] },
    { id: 9, firstName: 'Kavita', lastName: 'Rao', email: 'kavita@mahindra.com', phone: '9321098765', company: 'Mahindra Tech', jobTitle: 'CTO', type: 'Customer', source: 'Event', city: 'Pune', assignedTo: 'Sneha Iyer', createdOn: '2026-05-12', tags: ['key-account'] },
    { id: 10, firstName: 'Sanjay', lastName: 'Gupta', email: 'sanjay@bajaj.com', phone: '9210987654', company: 'Bajaj Finserv', jobTitle: 'DGM IT', type: 'Lead', source: 'Referral', city: 'Pune', assignedTo: 'Karan Shah', createdOn: '2026-05-15', tags: ['finance'] },
  ];

  readonly leads: CrmLead[] = [
    { id: 1, title: 'ERP Implementation — Infosys', contact: 'Priyank Sharma', company: 'Infosys Ltd', email: 'priya.sharma@infosys.com', phone: '9876543210', status: 'Qualified', source: 'Referral', value: 850000, priority: 'High', assignedTo: 'Rohan Mehta', expectedClose: '2026-06-30', createdOn: '2026-04-10', tags: ['enterprise'] },
    { id: 2, title: 'Cloud Migration — TCS', contact: 'Amit Verma', company: 'TCS', email: 'amit.v@tcs.com', phone: '9988776655', status: 'Contacted', source: 'Website', value: 500000, priority: 'High', assignedTo: 'Sneha Iyer', expectedClose: '2026-07-15', createdOn: '2026-04-15', tags: ['cloud'] },
    { id: 3, title: 'CRM Setup — Wipro', contact: 'Deepika Nair', company: 'Wipro', email: 'd.nair@wipro.com', phone: '9123456789', status: 'New', source: 'Cold Call', value: 320000, priority: 'Medium', assignedTo: 'Rohan Mehta', expectedClose: '2026-08-01', createdOn: '2026-04-20', tags: ['crm'] },
    { id: 4, title: 'Digital Transformation — TechCorp', contact: 'Suresh Patel', company: 'TechCorp India', email: 'suresh@techcorp.in', phone: '9012345678', status: 'Qualified', source: 'Campaign', value: 1200000, priority: 'High', assignedTo: 'Karan Shah', expectedClose: '2026-06-20', createdOn: '2026-04-25', tags: ['enterprise', 'priority'] },
    { id: 5, title: 'SaaS Subscription — StartupX', contact: 'Meera Joshi', company: 'StartupX', email: 'meera@startupx.io', phone: '9543210987', status: 'New', source: 'Website', value: 48000, priority: 'Low', assignedTo: 'Karan Shah', expectedClose: '2026-07-30', createdOn: '2026-05-08', tags: ['startup'] },
    { id: 6, title: 'Security Audit — Adani Group', contact: 'Vikram Bose', company: 'Adani Group', email: 'vikram.b@adani.com', phone: '9432109876', status: 'Contacted', source: 'Cold Call', value: 750000, priority: 'Medium', assignedTo: 'Rohan Mehta', expectedClose: '2026-09-01', createdOn: '2026-05-10', tags: ['security'] },
    { id: 7, title: 'Analytics Platform — Bajaj Finserv', contact: 'Sanjay Gupta', company: 'Bajaj Finserv', email: 'sanjay@bajaj.com', phone: '9210987654', status: 'Unqualified', source: 'Referral', value: 280000, priority: 'Low', assignedTo: 'Karan Shah', expectedClose: '2026-10-01', createdOn: '2026-05-15', tags: ['analytics'] },
    { id: 8, title: 'Mobile App — HCL Technologies', contact: 'Ananya Singh', company: 'HCL Technologies', email: 'ananya.s@hcl.com', phone: '9765432100', status: 'Converted', source: 'LinkedIn', value: 650000, priority: 'High', assignedTo: 'Sneha Iyer', expectedClose: '2026-05-30', createdOn: '2026-03-01', tags: ['mobile'] },
  ];

  // Make pipelineStages reactive using a Signal
  private _pipelineStages = signal<PipelineStage[]>([
    {
      id: 1, name: 'Lead', order: 1, color: '#6366F1', probability: 10,
      deals: [
        { id: 101, title: 'Data Warehouse — Mahindra Tech', contact: 'Kavita Rao', company: 'Mahindra Tech', stage: 'Lead', stageOrder: 1, value: 420000, probability: 10, assignedTo: 'Sneha Iyer', expectedClose: '2026-09-30', status: 'Open', createdOn: '2026-05-20', color: '#6366F1', priority: 'Warm', lastActivityDate: '2026-05-28' },
        { id: 102, title: 'HR Portal — Reliance Digital', contact: 'Rajesh Kumar', company: 'Reliance Digital', stage: 'Lead', stageOrder: 1, value: 180000, probability: 10, assignedTo: 'Karan Shah', expectedClose: '2026-10-15', status: 'Open', createdOn: '2026-05-22', color: '#6366F1', priority: 'Cold', lastActivityDate: '2026-05-22' },
      ]
    },
    {
      id: 2, name: 'Contacted', order: 2, color: '#8B5CF6', probability: 25,
      deals: [
        { id: 201, title: 'ERP Implementation — Infosys', contact: 'Priyank Sharma', company: 'Infosys Ltd', stage: 'Contacted', stageOrder: 2, value: 850000, probability: 25, assignedTo: 'Rohan Mehta', expectedClose: '2026-06-30', status: 'Open', createdOn: '2026-04-10', color: '#8B5CF6', priority: 'Hot', lastActivityDate: '2026-05-30' },
        { id: 202, title: 'Security Audit — Adani Group', contact: 'Vikram Bose', company: 'Adani Group', stage: 'Contacted', stageOrder: 2, value: 750000, probability: 25, assignedTo: 'Rohan Mehta', expectedClose: '2026-09-01', status: 'Open', createdOn: '2026-05-10', color: '#8B5CF6', priority: 'Warm', lastActivityDate: '2026-05-12' },
      ]
    },
    {
      id: 3, name: 'Proposal', order: 3, color: '#F59E0B', probability: 50,
      deals: [
        { id: 301, title: 'Cloud Migration — TCS', contact: 'Amit Verma', company: 'TCS', stage: 'Proposal', stageOrder: 3, value: 500000, probability: 50, assignedTo: 'Sneha Iyer', expectedClose: '2026-07-15', status: 'Open', createdOn: '2026-04-15', color: '#F59E0B', priority: 'Hot', lastActivityDate: '2026-05-29' },
        { id: 302, title: 'Digital Transformation — TechCorp', contact: 'Suresh Patel', company: 'TechCorp India', stage: 'Proposal', stageOrder: 3, value: 1200000, probability: 50, assignedTo: 'Karan Shah', expectedClose: '2026-06-20', status: 'Open', createdOn: '2026-04-25', color: '#F59E0B', priority: 'Hot', lastActivityDate: '2026-05-01' }, /* Stale deal */
      ]
    },
    {
      id: 4, name: 'Negotiation', order: 4, color: '#F97316', probability: 75,
      deals: [
        { id: 401, title: 'Analytics Platform — Bajaj Finserv', contact: 'Sanjay Gupta', company: 'Bajaj Finserv', stage: 'Negotiation', stageOrder: 4, value: 280000, probability: 75, assignedTo: 'Karan Shah', expectedClose: '2026-06-10', status: 'Open', createdOn: '2026-05-01', color: '#F97316', priority: 'Warm', lastActivityDate: '2026-05-30' },
      ]
    },
    {
      id: 5, name: 'Won', order: 5, color: '#22C55E', probability: 100,
      deals: [
        { id: 501, title: 'Mobile App — HCL Technologies', contact: 'Ananya Singh', company: 'HCL Technologies', stage: 'Won', stageOrder: 5, value: 650000, probability: 100, assignedTo: 'Sneha Iyer', expectedClose: '2026-05-30', status: 'Won', createdOn: '2026-03-01', color: '#22C55E', priority: 'Hot', lastActivityDate: '2026-05-30' },
        { id: 502, title: 'CRM Setup — Wipro', contact: 'Deepika Nair', company: 'Wipro', stage: 'Won', stageOrder: 5, value: 320000, probability: 100, assignedTo: 'Rohan Mehta', expectedClose: '2026-05-15', status: 'Won', createdOn: '2026-04-20', color: '#22C55E', priority: 'Hot', lastActivityDate: '2026-05-15' },
      ]
    },
    {
      id: 6, name: 'Lost', order: 6, color: '#EF4444', probability: 0,
      deals: [
        { id: 601, title: 'SaaS Subscription — StartupX', contact: 'Meera Joshi', company: 'StartupX', stage: 'Lost', stageOrder: 6, value: 48000, probability: 0, assignedTo: 'Karan Shah', expectedClose: '2026-05-01', status: 'Lost', createdOn: '2026-05-08', color: '#EF4444', priority: 'Cold', lastActivityDate: '2026-05-10', lostReason: 'Price' },
      ]
    },
  ]);

  get pipelineStages() {
    return this._pipelineStages();
  }

  // --- CRUD Methods for Deals ---

  addDeal(stageName: string, deal: Omit<CrmDeal, 'id' | 'createdOn' | 'stageOrder' | 'color' | 'status'>) {
    this._pipelineStages.update(stages => {
      const newStages = JSON.parse(JSON.stringify(stages)) as PipelineStage[];
      const stage = newStages.find(s => s.name === stageName);
      if (stage) {
        const today = new Date().toISOString().split('T')[0];
        const newDeal: CrmDeal = {
          ...deal,
          id: Math.floor(Math.random() * 10000),
          createdOn: today,
          lastActivityDate: today,
          stageOrder: stage.order,
          color: stage.color,
          status: stageName === 'Closed Won' ? 'Won' : stageName === 'Closed Lost' ? 'Lost' : 'Open'
        };
        stage.deals.push(newDeal);
      }
      return newStages;
    });
  }

  updateDeal(dealId: number, updatedDeal: Partial<CrmDeal>) {
    this._pipelineStages.update(stages => {
      const newStages = JSON.parse(JSON.stringify(stages)) as PipelineStage[];
      for (const stage of newStages) {
        const index = stage.deals.findIndex(d => d.id === dealId);
        if (index !== -1) {
          // If stage name changed, we need to move it
          if (updatedDeal.stage && updatedDeal.stage !== stage.name) {
            const targetStage = newStages.find(s => s.name === updatedDeal.stage);
            if (targetStage) {
              const [deal] = stage.deals.splice(index, 1);
              const movedDeal = {
                ...deal,
                ...updatedDeal,
                stageOrder: targetStage.order,
                color: targetStage.color,
                status: targetStage.name === 'Closed Won' ? 'Won' : targetStage.name === 'Closed Lost' ? 'Lost' : 'Open' as any
              };
              targetStage.deals.push(movedDeal);
            }
          } else {
            stage.deals[index] = { ...stage.deals[index], ...updatedDeal };
          }
          break;
        }
      }
      return newStages;
    });
  }

  deleteDeal(dealId: number) {
    this._pipelineStages.update(stages => {
      const newStages = JSON.parse(JSON.stringify(stages)) as PipelineStage[];
      for (const stage of newStages) {
        const index = stage.deals.findIndex(d => d.id === dealId);
        if (index !== -1) {
          stage.deals.splice(index, 1);
          break;
        }
      }
      return newStages;
    });
  }

  moveDeal(dealId: number, targetStageName: string, newIndex: number) {
    this._pipelineStages.update(stages => {
      const newStages = JSON.parse(JSON.stringify(stages)) as PipelineStage[];
      let foundDeal: CrmDeal | null = null;
      let sourceStageIndex = -1;
      let sourceDealIndex = -1;

      // Find the deal
      for (let i = 0; i < newStages.length; i++) {
        const dIndex = newStages[i].deals.findIndex(d => d.id === dealId);
        if (dIndex !== -1) {
          foundDeal = newStages[i].deals[dIndex];
          sourceStageIndex = i;
          sourceDealIndex = dIndex;
          break;
        }
      }

      if (foundDeal) {
        const targetStage = newStages.find(s => s.name === targetStageName);
        if (targetStage) {
          // Remove from source
          newStages[sourceStageIndex].deals.splice(sourceDealIndex, 1);

          // Update properties
          foundDeal.stage = targetStage.name;
          foundDeal.stageOrder = targetStage.order;
          foundDeal.color = targetStage.color;
          foundDeal.status = targetStage.name === 'Closed Won' ? 'Won' : targetStage.name === 'Closed Lost' ? 'Lost' : 'Open';

          // Insert at new index
          targetStage.deals.splice(newIndex, 0, foundDeal);
        }
      }
      return newStages;
    });
  }

  bulkDeleteDeals(dealIds: number[]) {
    this._pipelineStages.update(stages => {
      const newStages = JSON.parse(JSON.stringify(stages)) as PipelineStage[];
      for (const stage of newStages) {
        stage.deals = stage.deals.filter(d => !dealIds.includes(d.id));
      }
      return newStages;
    });
  }

  bulkUpdateDeals(dealIds: number[], updates: Partial<CrmDeal>) {
    this._pipelineStages.update(stages => {
      const newStages = JSON.parse(JSON.stringify(stages)) as PipelineStage[];

      const dealsToMove: { deal: CrmDeal, targetStage: PipelineStage }[] = [];

      for (const stage of newStages) {
        for (let i = stage.deals.length - 1; i >= 0; i--) {
          const deal = stage.deals[i];
          if (dealIds.includes(deal.id)) {
            // Apply updates
            Object.assign(deal, updates);

            // If stage changed, queue for moving
            if (updates.stage && updates.stage !== stage.name) {
              const targetStage = newStages.find(s => s.name === updates.stage);
              if (targetStage) {
                stage.deals.splice(i, 1);
                deal.stageOrder = targetStage.order;
                deal.color = targetStage.color;
                deal.status = targetStage.name === 'Closed Won' ? 'Won' : targetStage.name === 'Closed Lost' ? 'Lost' : 'Open' as any;
                dealsToMove.push({ deal, targetStage });
              }
            }
          }
        }
      }

      // Process moves
      for (const move of dealsToMove) {
        move.targetStage.deals.push(move.deal);
      }

      return newStages;
    });
  }

  private _activities = signal<CrmActivity[]>([
    { id: 1, type: 'Call', subject: 'Follow-up on ERP proposal', linkedTo: 'Priyank Sharma', linkedType: 'Lead', assignedTo: 'Rohan Mehta', dueDate: '2026-05-31', status: 'Pending', priority: 'High', description: 'Discuss pricing and implementation timeline for Infosys ERP project.' },
    { id: 2, type: 'Meeting', subject: 'Product demo — TechCorp', dealId: 302, linkedTo: 'Suresh Patel', linkedType: 'Deal', assignedTo: 'Karan Shah', dueDate: '2026-06-02', status: 'Pending', priority: 'High', description: 'Live demo of digital transformation suite. Bring case studies.' },
    { id: 3, type: 'Email', subject: 'Send proposal — Bajaj Finserv', dealId: 401, linkedTo: 'Sanjay Gupta', linkedType: 'Deal', assignedTo: 'Karan Shah', dueDate: '2026-05-30', status: 'Completed', priority: 'Medium', description: 'Sent detailed analytics platform proposal with ROI breakdown.' },
    { id: 4, type: 'Task', subject: 'Prepare contract — HCL Technologies', dealId: 501, linkedTo: 'Ananya Singh', linkedType: 'Deal', assignedTo: 'Sneha Iyer', dueDate: '2026-05-28', status: 'Completed', priority: 'High', description: 'Draft MSA and SOW for mobile app project.' },
    { id: 5, type: 'Call', subject: 'Cold call — Adani IT team', linkedTo: 'Vikram Bose', linkedType: 'Lead', assignedTo: 'Rohan Mehta', dueDate: '2026-06-05', status: 'Pending', priority: 'Medium', description: 'Initial qualification call for security audit requirements.' },
    { id: 6, type: 'Note', subject: 'Meeting notes — Wipro onboarding', dealId: 502, linkedTo: 'Deepika Nair', linkedType: 'Contact', assignedTo: 'Rohan Mehta', dueDate: '2026-05-27', status: 'Completed', priority: 'Low', description: 'Collected requirements for CRM setup. POC to begin next week.' },
    { id: 7, type: 'Meeting', subject: 'Quarterly review — TCS', dealId: 301, linkedTo: 'Amit Verma', linkedType: 'Deal', assignedTo: 'Sneha Iyer', dueDate: '2026-06-10', status: 'Pending', priority: 'High', description: 'Review cloud migration milestones and address blockers.' },
    { id: 8, type: 'Task', subject: 'Update CRM records — Mahindra', dealId: 101, linkedTo: 'Kavita Rao', linkedType: 'Deal', assignedTo: 'Sneha Iyer', dueDate: '2026-06-01', status: 'Pending', priority: 'Low', description: 'Update contact details and data warehouse requirements from last call.' },
  ]);

  get activities() {
    return this._activities();
  }

  addActivity(dealId: number, noteText: string, assignedTo: string) {
    this._activities.update(acts => {
      const newActs = [...acts];
      newActs.unshift({
        id: Math.floor(Math.random() * 10000),
        type: 'Note',
        subject: 'Quick Note',
        linkedTo: 'Deal',
        linkedType: 'Deal',
        dealId: dealId,
        assignedTo: assignedTo,
        dueDate: new Date().toISOString().split('T')[0],
        status: 'Completed',
        priority: 'Medium',
        description: noteText
      });
      return newActs;
    });

    // Update the lastActivityDate on the deal
    this.updateDeal(dealId, { lastActivityDate: new Date().toISOString().split('T')[0] });
  }

  createNewActivity(data: Partial<CrmActivity>) {
    this._activities.update(acts => {
      const newActs = [...acts];
      newActs.unshift({
        id: Math.floor(Math.random() * 10000),
        type: data.type || 'Task',
        subject: data.subject || 'New Activity',
        linkedTo: data.linkedTo || 'General',
        linkedType: data.linkedType || 'Contact',
        dealId: data.dealId,
        assignedTo: data.assignedTo || this.currentUser.name,
        dueDate: data.dueDate || new Date().toISOString().split('T')[0],
        status: data.status || 'Pending',
        priority: data.priority || 'Medium',
        description: data.description || ''
      } as CrmActivity);
      return newActs;
    });
  }

  // --- Campaigns Data ---
  private _campaigns = signal<CrmCampaign[]>([
    { id: 1, name: 'Q3 Enterprise Outreach', type: 'Email', status: 'Completed', targetAudience: 'Enterprise Leads', sendDate: '2026-04-15', sentCount: 1250, openRate: 42.5, clickRate: 15.2 },
    { id: 2, name: 'Summer Discount Promo', type: 'WhatsApp', status: 'Active', targetAudience: 'Converted Customers', sendDate: '2026-05-28', sentCount: 3500, openRate: 85.0, clickRate: 45.1 },
    { id: 3, name: 'New Product Teaser', type: 'Email', status: 'Scheduled', targetAudience: 'All Subscribers', sendDate: '2026-06-10', sentCount: 0, openRate: 0, clickRate: 0 },
    { id: 4, name: 'Webinar Invitation', type: 'Social', status: 'Active', targetAudience: 'Tech Industries', sendDate: '2026-05-25', sentCount: 5000, openRate: 12.0, clickRate: 3.5 },
    { id: 5, name: 'Follow-up Nurture', type: 'Email', status: 'Draft', targetAudience: 'Cold Leads', sendDate: '', sentCount: 0, openRate: 0, clickRate: 0 },
  ]);

  get campaigns() {
    return this._campaigns();
  }

  createNewCampaign(data: Partial<CrmCampaign>) {
    this._campaigns.update(c => {
      const newC = [...c];
      newC.unshift({
        id: Math.floor(Math.random() * 10000),
        name: data.name || 'New Campaign',
        type: data.type || 'Email',
        status: data.status || 'Draft',
        targetAudience: data.targetAudience || 'General',
        sendDate: data.sendDate || '',
        sentCount: 0,
        openRate: 0,
        clickRate: 0
      } as CrmCampaign);
      return newC;
    });
  }

  get dashboardStats() {
    const leads = this.leads;
    const stages = this._pipelineStages();
    const acts = this._activities();

    // pipeline value = sum of all open deals
    const openStages = stages.filter(s => s.name !== 'Won' && s.name !== 'Lost');
    const openDeals = openStages.flatMap(s => s.deals);
    const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
    const totalDeals = stages.flatMap(s => s.deals).length;

    const wonStage = stages.find(s => s.name === 'Won');
    const wonDeals = wonStage ? wonStage.deals.length : 0;
    const closedWonValue = wonStage ? wonStage.deals.reduce((sum, d) => sum + d.value, 0) : 0;

    const overdueActivities = acts.filter(a => a.status === 'Pending' && new Date(a.dueDate) < new Date()).length;

    const dealsByStage = openStages.map(s => ({
      stage: s.name,
      count: s.deals.length,
      value: s.deals.reduce((sum, d) => sum + d.value, 0)
    }));

    // Group leads by source
    const sourceMap = new Map<string, number>();
    leads.forEach(l => {
      sourceMap.set(l.source, (sourceMap.get(l.source) || 0) + 1);
    });
    const leadsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }));

    return {
      totalLeads: leads.length,
      newLeads: leads.filter(l => l.status === 'New').length,
      qualifiedLeads: leads.filter(l => l.status === 'Qualified').length,
      convertedLeads: leads.filter(l => l.status === 'Converted').length,

      totalDeals, openDeals: openDeals.length, wonDeals, lostDeals: stages.find(s => s.name === 'Lost')?.deals.length || 0,
      pipelineValue, closedWonValue,

      totalContacts: this.contacts.length, totalActivities: acts.length, overdueActivities,
      conversionRate: 12.5, avgDealSize: Math.round(pipelineValue / (openDeals.length || 1)),

      monthlyRevenue: [320000, 490000, 280000, 650000, 970000, 1200000],
      revenueLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      leadsBySource,
      dealsByStage,
    };
  }

  getLeadsByStatus(status: string) {
    return this.leads.filter(l => l.status === status);
  }

  getActivitiesByStatus(status: string) {
    return this.activities.filter(a => a.status === status);
  }

  getContactsByType(type: string) {
    return this.contacts.filter(c => c.type === type);
  }

  formatCurrency(value: number): string {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  }
}
