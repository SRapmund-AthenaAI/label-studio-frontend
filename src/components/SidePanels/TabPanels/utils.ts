import { FC, ReactNode } from 'react';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_MAX_HEIGHT, DEFAULT_PANEL_WIDTH, PANEL_HEADER_HEIGHT } from '../constants';
import { Comments, History, Relations } from '../DetailsPanel/DetailsPanel';
import { OutlinerComponent } from '../OutlinerPanel/OutlinerPanel';
import { PanelProps } from '../PanelBase';
import { PanelBBox, PanelView, Side } from './types';

export const lastCallTime: { [key: string]: number } | undefined = {};
export const timeouts: { [key: string]: ReturnType<typeof setTimeout> | null } = {};
export const determineLeftOrRight = (event: any, droppableElement?: ReactNode) => {
  const element = droppableElement || event.target as HTMLElement;  
  const dropWidth = (element as HTMLElement).clientWidth as number;
  const x = event.pageX as number - (element as HTMLElement).getBoundingClientRect().left;
  const half = dropWidth / 2;
    
  return x > half ? Side.right : Side.left;
};
  
export const determineDroppableArea = (droppingElement: HTMLElement) => droppingElement.id.includes('droppable');

export const stateRemovedTab = (state: Record<string, PanelBBox>, movingPanel: string, movingTab: number) => {
  const newState = { ...state };

  if (!newState[movingPanel]) return newState;
  const panel = newState[movingPanel];

  panel.panelViews = panel.panelViews
    .filter((_, tabIterator) => tabIterator !== movingTab);

  return newState;
};

export const setActive = (state: Record<string, PanelBBox>, key: string, tabIndex: number) => {
  const newState = {
    ...state, [key]: {
      ...state[key], panelViews: state[key].panelViews.map((view, index) => {
        view.active = index === tabIndex;
        return view;
      }),
    },
  };

  return newState;
};

export const setActiveDefaults = (state: Record<string, PanelBBox>) => {
  const newState = { ...state };

  Object.keys(state).forEach((panelKey: string) => {
    const hasActiveTab = newState[panelKey].panelViews.some((view) => view.active);
    
    if (!hasActiveTab) newState[panelKey].panelViews[0].active = true;
  });

  return newState;
};


export const renameKeys = (state: Record<string, PanelBBox>) => {
  const newState = {};

  Object.keys(state).forEach((panelKey: string) => {
    const newKey = `${state[panelKey].panelViews.map(view => view.name).join('-')}`;
    const panel = { ...state[panelKey] };

    Object.assign(newState, { [newKey]: panel });
  });

  return newState;
};

export const stateAddedTab = (
  state: Record<string, PanelBBox>,
  receivingPanel: string,
  movingTabData: PanelView,
  receivingTab: number,
  dropSide: Side,
) => {
  const newState = { ...state };
  const panel = newState[receivingPanel];
  const newPanelViews = panel.panelViews;

  newPanelViews.splice(receivingTab + (dropSide === Side.right ? 1 : 0), 0, movingTabData);
  return newState;
};

export const stateRemovePanelEmptyViews = (state: Record<string, PanelBBox>) => {
  const newState = { ...state };

  Object.keys(newState).forEach((panel) => {
    if (newState[panel].panelViews.length === 0) delete newState[panel];
    else newState[panel].panelViews.forEach(view => view.active = false);
  });
  return newState;
};

export const panelComponents: {[key:string]: FC<PanelProps>} = {
  'outliner': OutlinerComponent as FC<PanelProps>,
  'history': History as FC<PanelProps>,
  'relations': Relations as FC<PanelProps>,
  'comments': Comments as FC<PanelProps>,
};

const panelViews = [
  {
    name: 'outliner',
    title: 'Outliner',
    component: panelComponents['outliner'] as FC<PanelProps>,
    active: true,
  },
  {
    name: 'history',
    title: 'History',
    component: panelComponents['history'] as FC<PanelProps>,
    active: true,
  },
  {
    name: 'comments',
    title: 'Comments',
    component: panelComponents['comments'] as FC<PanelProps>,
    active: false,
  },
  {
    name: 'relations',
    title: 'Relations',
    component: panelComponents['relations'] as FC<PanelProps>,
    active: false,
  },
];

export const defaultPanelState: Record<string, PanelBBox> = {
  'outliner': {
    top: 0,
    left: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 1,
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    visible: true,
    detached: false,
    alignment: Side.left,
    maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
    panelViews: [panelViews[0]],
  },
  'history-comments-relations': {
    top: 0,
    left: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 1,
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    visible: true,
    detached: false,
    alignment: Side.right,
    maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
    panelViews: [panelViews[1], panelViews[2], panelViews[3]],
  },
};

export const resizers = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'top',
  'bottom',
  'right',
  'left',
];

export const restorePanel = () => {
  const panelData = window.localStorage.getItem('panelState');
  const parsed = panelData && JSON.parse(panelData);
  const allTabs = panelData && Object.entries(parsed).map(([_, panel]: any) => panel.panelViews).flat(1);
  const noEmptyPanels = stateRemovePanelEmptyViews(parsed);
  const withActiveDefaults = setActiveDefaults(noEmptyPanels);
  return defaultPanelState;
  if (!allTabs || allTabs.length !== panelViews.length) return defaultPanelState;
  return restoreComponentsToState(withActiveDefaults);
};

export const restoreComponentsToState = (panelData: Record<string, PanelBBox>) => {
  const updatedPanels: any = { ...panelData };
  
  Object.keys(updatedPanels).forEach(panelName => {
    const panel = updatedPanels[panelName];

    panel.panelViews.forEach((view: { name: string, component: FC<PanelProps> }) => {
      view.component = panelComponents[view.name];
    });
  });

  return updatedPanels; 
};

export const savePanels = (panelData: Record<string, PanelBBox>) => {
  window.localStorage.setItem('panelState', JSON.stringify(panelData));
};

export const getLeftKeys = (state: Record<string, PanelBBox>) =>  Object.keys(state).filter((key) => !state[key].detached && state[key].alignment === Side.left);
export const getRightKeys = (state: Record<string, PanelBBox>) =>  Object.keys(state).filter((key) => !state[key].detached && state[key].alignment === Side.right);

export const getAttachedPerSide = (state: Record<string, PanelBBox>, side: Side) => {
  if (side === Side.left) return getLeftKeys(state);
  if (side === Side.right) return getRightKeys(state);
};

export const getSnappedHeights = (
  state: Record<string, PanelBBox>,
  totalHeight: number,
) => {
  const newState = { ...state };
  const leftKeys = getLeftKeys(newState);
  const rightKeys = getRightKeys(newState);

  [leftKeys, rightKeys].forEach(list => {
    console.log(list.length)
    const collapsedAdjustments = list.reduce((acc, panelKey) => {
      if (newState[panelKey].visible) return acc + PANEL_HEADER_HEIGHT;
      else return acc;
    }, 0);

    const totalCollapsed = list.filter(panelKey => !newState[panelKey].visible).length;
    const panelHeight = (totalHeight - collapsedAdjustments) /  ((list.length - totalCollapsed) || 1);
    
    let top = 0;

    list.forEach(panelKey => {
      console.log(newState[panelKey].visible);
      if (newState[panelKey].visible) {
        newState[panelKey].height = panelHeight;
        newState[panelKey].top = top;
        top += newState[panelKey].height;
      } else top += PANEL_HEADER_HEIGHT;
    });
  });
  console.log(newState);

  return newState ;
};

export const joinPanelColumns = (
  state: Record<string, PanelBBox>,
  panelAddKey: string,
  alignment: Side,
  width: number,
) => {
  console.log('joinPanelColumns', alignment);
  return {
    ...state, [panelAddKey]: {
      ...state[panelAddKey],
      width,
      alignment,
      detached: false,
    },
  };
};

export const splitPanelColumns = (
  state: Record<string, PanelBBox>,
  sameSidePanelKeys: string[],
  removingKey: string,
  totalHeight: number,
) => {
  const newState = { ...state };
  const panelRemovedKeys = sameSidePanelKeys.filter(panelKey => panelKey !== removingKey);
  const panelHeight = totalHeight / panelRemovedKeys.length;

  const movingTabAttributes = {
    width: DEFAULT_PANEL_WIDTH,
    detached: true,
    height: DEFAULT_PANEL_HEIGHT,
  };

  panelRemovedKeys.forEach(panelKey => {
    newState[panelKey].height = panelHeight;
  });

  return { ...newState, [removingKey]: { ...newState[removingKey], ...movingTabAttributes } };
};