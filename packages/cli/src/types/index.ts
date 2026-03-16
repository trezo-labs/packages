export type TemplateType = {
  value: string;
  label: string;
  path: string;
  postSetupCommands?: string[];
};

export type PackageType = {
  value: string;
  label: string;
  templates: TemplateType[];
};
