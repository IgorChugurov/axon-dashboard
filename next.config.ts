import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  async redirects() {
    return [
      // ================================
      // Entity Definition routes redirects
      // ================================
      
      // New Entity Definition
      {
        source: '/projects/:projectId/entity-definition/new',
        destination: '/projects/:projectId/new',
        permanent: true,
      },
      
      // Edit Entity Definition
      {
        source: '/projects/:projectId/entity-definition/:entityDefId/edit',
        destination: '/projects/:projectId/:entityDefId/edit',
        permanent: true,
      },
      
      // ================================
      // Fields routes redirects
      // ================================
      
      // Fields list
      {
        source: '/projects/:projectId/entity-definition/:entityDefId/fields',
        destination: '/projects/:projectId/:entityDefId/fields',
        permanent: true,
      },
      
      // New Field
      {
        source: '/projects/:projectId/entity-definition/:entityDefId/fields/new',
        destination: '/projects/:projectId/:entityDefId/fields/new',
        permanent: true,
      },
      
      // Edit Field (старый формат с /edit)
      {
        source: '/projects/:projectId/entity-definition/:entityDefId/fields/:fieldId/edit',
        destination: '/projects/:projectId/:entityDefId/fields/:fieldId',
        permanent: true,
      },
      
      // ================================
      // Entity Instances routes redirects
      // ================================
      
      // Instances list
      {
        source: '/projects/:projectId/entity-instances/:entityDefId',
        destination: '/projects/:projectId/:entityDefId',
        permanent: true,
      },
      
      // New Instance
      {
        source: '/projects/:projectId/entity-instances/:entityDefId/new',
        destination: '/projects/:projectId/:entityDefId/new',
        permanent: true,
      },
      
      // Edit Instance (старый формат с /edit)
      {
        source: '/projects/:projectId/entity-instances/:entityDefId/:instanceId/edit',
        destination: '/projects/:projectId/:entityDefId/:instanceId',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
