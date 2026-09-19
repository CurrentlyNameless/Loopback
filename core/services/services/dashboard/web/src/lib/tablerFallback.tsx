import React from 'react';

const PATHS: Record<string, string> = {
  "IconCheck": "M5 12l5 5l10 -10",
  "IconChecks": "M7 12l5 5l10 -10M2 12l5 5m5 -5l5 -5",
  "IconX": "M18 6l-12 12M6 6l12 12",
  "IconChevronRight": "M9 6l6 6l-6 6",
  "IconChevronLeft": "M15 6l-6 6l6 6",
  "IconChevronDown": "M6 9l6 6l6 -6",
  "IconChevronUp": "M6 15l6 -6l6 6",
  "IconSearch": "M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0M21 21l-6 -6",
  "IconCopy": "M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2zM16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2",
  "IconAlertTriangle": "M12 9v4M12 17h.01M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75",
  "IconAlertCircle": "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 8v4M12 16h.01",
  "IconInfoCircle": "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 9h.01M11 12h1v4h1",
  "IconStar": "M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z",
  "IconStarFilled": "M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z",
  "IconSparkles": "M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 3a5 5 0 0 1 5 5a5 5 0 0 1 5 -5a5 5 0 0 1 -5 -5a5 5 0 0 1 -5 5z",
  "IconRefresh": "M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",
  "IconReload": "M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747M20 4v5h-5",
  "IconHeart": "M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572",
  "IconHash": "M5 9h14M5 15h14M11 4l-4 16M17 4l-4 16",
  "IconExternalLink": "M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6M11 13l9 -9M15 4h5v5",
  "IconSettings": "M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065zM9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
  "IconDownload": "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2M7 11l5 5l5 -5M12 4v12",
  "IconUpload": "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2M7 9l5 -5l5 5M12 4v12",
  "IconEye": "M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6",
  "IconPackage": "M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5M12 12l8 -4.5M12 12l0 9M12 12l-8 -4.5",
  "IconShoppingBag": "M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304zM9 11v-5a3 3 0 0 1 6 0v5",
  "IconShield": "M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3",
  "IconShieldLock": "M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3M12 11m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M12 12v2.5",
  "IconArrowRight": "M5 12l14 0M13 18l6 -6M13 6l6 6",
  "IconArrowLeft": "M5 12l14 0M5 12l6 6M5 12l6 -6",
  "IconActivity": "M3 12h4l3 8l4 -16l3 8h4",
  "IconAdjustments": "M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 M6 4v4 M6 12v8 M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 M12 4v10 M12 18v2 M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 M18 4v1 M18 9v11",
  "IconAlignCenter": "M4 6l16 0 M8 12l8 0 M6 18l12 0",
  "IconAlignLeft": "M4 6l16 0 M4 12l10 0 M4 18l14 0",
  "IconAlignRight": "M4 6l16 0 M10 12l10 0 M6 18l14 0",
  "IconArrowDown": "M12 5l0 14 M18 13l-6 6 M6 13l6 6",
  "IconArrowUp": "M12 5l0 14 M18 11l-6 -6 M6 11l6 -6",
  "IconArrowUpRight": "M17 7l-10 10 M8 7l9 0l0 9",
  "IconArrowsExchange": "M7 10h14l-4 -4 M17 14h-14l4 4",
  "IconArrowsShuffle": "M18 4l3 3l-3 3 M18 20l3 -3l-3 -3 M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5 M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3",
  "IconAt": "M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M16 12v1.5a2.5 2.5 0 0 0 5 0v-1.5a9 9 0 1 0 -5.5 8.28",
  "IconBan": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M5.7 5.7l12.6 12.6",
  "IconBell": "M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6 M9 17v1a3 3 0 0 0 6 0v-1",
  "IconBellOff": "M9.346 5.353a2 2 0 0 1 2.654 -1.353a2 2 0 0 1 2 2a7 7 0 0 1 4 6v3m1 1a4 4 0 0 0 1 2h-14a4 4 0 0 0 2 -3v-3a7 7 0 0 1 .537 -2.693M9 17v1a3 3 0 0 0 6 0v-1M3 3l18 18",
  "IconBold": "M7 5h6a3.5 3.5 0 0 1 0 7h-6l0 -7 M13 12h1a3.5 3.5 0 0 1 0 7h-7v-7",
  "IconBolt": "M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11",
  "IconBook": "M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0 M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0 M3 6l0 13 M12 6l0 13 M21 6l0 13",
  "IconBorderRadius": "M4 12v-4a4 4 0 0 1 4 -4h4 M16 4l0 .01 M20 4l0 .01 M20 8l0 .01 M20 12l0 .01 M4 16l0 .01 M20 16l0 .01 M4 20l0 .01 M8 20l0 .01 M12 20l0 .01 M16 20l0 .01 M20 20l0 .01",
  "IconBox": "M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5 M12 12l8 -4.5 M12 12l0 9 M12 12l-8 -4.5",
  "IconBraces": "M7 4a2 2 0 0 0 -2 2v3a2 3 0 0 1 -2 3a2 3 0 0 1 2 3v3a2 2 0 0 0 2 2 M17 4a2 2 0 0 1 2 2v3a2 3 0 0 0 2 3a2 3 0 0 0 -2 3v3a2 2 0 0 1 -2 2",
  "IconBrandAndroid": "M4 10l0 6 M20 10l0 6 M7 9h10v8a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-8a5 5 0 0 1 10 0 M8 3l1 2 M16 3l-1 2 M9 18l0 3 M15 18l0 3",
  "IconBrandApple": "M8.286 7.008c-3.216 0 -4.286 3.23 -4.286 5.92c0 3.229 2.143 8.072 4.286 8.072c1.165 -.05 1.799 -.538 3.214 -.538c1.406 0 1.607 .538 3.214 .538s4.286 -3.229 4.286 -5.381c-.03 -.011 -2.649 -.434 -2.679 -3.23c-.02 -2.335 2.589 -3.179 2.679 -3.228c-1.096 -1.606 -3.162 -2.113 -3.75 -2.153c-1.535 -.12 -3.032 1.077 -3.75 1.077c-.729 0 -2.036 -1.077 -3.214 -1.077 M12 4a2 2 0 0 0 2 -2a2 2 0 0 0 -2 2",
  "IconBrandDiscord": "M8 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0 M14 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0 M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-.972 1.923a11.913 11.913 0 0 0 -4.053 0l-.975 -1.923c-1.5 .16 -3.043 .485 -4.5 1.5c-2 5.667 -2.167 9.833 -1.5 11.5c.667 1.333 2 3 3.5 3c.5 0 2 -2 2 -3 M7 16.5c3.5 1 6.5 1 10 0",
  "IconBrandGithub": "M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5",
  "IconBrandPaypal": "M10 13l2.5 0c2.5 0 5 -2.5 5 -5c0 -3 -1.9 -5 -5 -5h-5.5c-.5 0 -1 .5 -1 1l-2 14c0 .5 .5 1 1 1h2.8l1.2 -5c.1 -.6 .4 -1 1 -1m7.5 -5.8c1.7 1 2.5 2.8 2.5 4.8c0 2.5 -2.5 4.5 -5 4.5h-2.6l-.6 3.6a1 1 0 0 1 -1 .8l-2.7 0a.5 .5 0 0 1 -.5 -.6l.2 -1.4",
  "IconBrandSoundcloud": "M17 11h1c1.38 0 3 1.274 3 3c0 1.657 -1.5 3 -3 3l-6 0v-10c3 0 4.5 1.5 5 4 M9 8l0 9 M6 17l0 -7 M3 16l0 -2",
  "IconBrandSpotify": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M8 11.973c2.5 -1.473 5.5 -.973 7.5 .527 M9 15c1.5 -1 4 -1 5 .5 M7 9c2 -1 6 -2 10 .5",
  "IconBrandStripe": "M11.453 8.056c0 -.623 .518 -.979 1.442 -.979c1.69 0 3.41 .343 4.605 .923l.5 -4c-.948 -.449 -2.82 -1 -5.5 -1c-1.895 0 -3.373 .087 -4.5 1c-1.172 .956 -2 2.33 -2 4c0 3.03 1.958 4.906 5 6c1.961 .69 3 .743 3 1.5c0 .735 -.851 1.5 -2 1.5c-1.423 0 -3.963 -.609 -5.5 -1.5l-.5 4c1.321 .734 3.474 1.5 6 1.5c2 0 3.957 -.468 5.084 -1.36c1.263 -.979 1.916 -2.268 1.916 -4.14c0 -3.096 -1.915 -4.547 -5 -5.637c-1.646 -.605 -2.544 -1.07 -2.544 -1.807l-.003 0",
  "IconBrandTelegram": "M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4",
  "IconBrandTwitter": "M22 4.01c-1 .49 -1.98 .689 -3 .99c-1.121 -1.265 -2.783 -1.335 -4.38 -.737s-2.643 2.06 -2.62 3.737v1c-3.245 .083 -6.135 -1.395 -8 -4c0 0 -4.182 7.433 4 11c-1.872 1.247 -3.739 2.088 -6 2c3.308 1.803 6.913 2.423 10.034 1.517c3.58 -1.04 6.522 -3.723 7.651 -7.742a13.84 13.84 0 0 0 .497 -3.753c0 -.249 1.51 -2.772 1.818 -4.013l0 .001",
  "IconBrandWindows": "M17.8 20l-12 -1.5c-1 -.1 -1.8 -.9 -1.8 -1.9v-9.2c0 -1 .8 -1.8 1.8 -1.9l12 -1.5c1.2 -.1 2.2 .8 2.2 1.9v12.1c0 1.2 -1.1 2.1 -2.2 1.9l0 .1 M12 5l0 14 M4 12l16 0",
  "IconBrandX": "M4 4l11.733 16h4.267l-11.733 -16l-4.267 0 M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772",
  "IconBrandYoutube": "M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8 M10 9l5 3l-5 3l0 -6",
  "IconBroadcast": "M18.364 19.364a9 9 0 1 0 -12.728 0 M15.536 16.536a5 5 0 1 0 -7.072 0 M11 13a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
  "IconBug": "M9 9v-1a3 3 0 0 1 6 0v1 M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3 M3 13l4 0 M17 13l4 0 M12 20l0 -6 M4 19l3.35 -2 M20 19l-3.35 -2 M4 7l3.75 2.4 M20 7l-3.75 2.4",
  "IconBuildingCommunity": "M8 9l5 5v7h-5v-4m0 4h-5v-7l5 -5m1 1v-6a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v17h-8 M13 7l0 .01 M17 7l0 .01 M17 11l0 .01 M17 15l0 .01",
  "IconBulb": "M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7 M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3 M9.7 17l4.6 0",
  "IconCake": "M3 20h18v-8a3 3 0 0 0 -3 -3h-12a3 3 0 0 0 -3 3v8 M3 14.803c.312 .135 .654 .204 1 .197a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1c.35 .007 .692 -.062 1 -.197 M12 4l1.465 1.638a2 2 0 1 1 -3.015 .099l1.55 -1.737",
  "IconCalendar": "M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12 M16 3v4 M8 3v4 M4 11h16 M11 15h1 M12 15v3",
  "IconCalendarTime": "M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4 M14 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M15 3v4 M7 3v4 M3 11h16 M18 16.496v1.504l1 1",
  "IconChartBar": "M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6 M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10 M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14 M4 20h14",
  "IconCheckbox": "M9 11l3 3l8 -8 M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9",
  "IconChecklist": "M9.615 20h-2.615a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8 M14 19l2 2l4 -4 M9 8h4 M9 12h2",
  "IconCircleCheckFilled": "M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z",
  "IconClock": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M12 7v5l3 3",
  "IconCloudUpload": "M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1 M9 15l3 -3l3 3 M12 12l0 9",
  "IconCode": "M7 8l-4 4l4 4 M17 8l4 4l-4 4 M14 4l-4 16",
  "IconCoin": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M14.8 9a2 2 0 0 0 -1.8 -1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1 -1.8 -1 M12 7v10",
  "IconCoins": "M9 14c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3 M9 14v4c0 1.656 2.686 3 6 3s6 -1.344 6 -3v-4 M3 6c0 1.072 1.144 2.062 3 2.598s4.144 .536 6 0c1.856 -.536 3 -1.526 3 -2.598c0 -1.072 -1.144 -2.062 -3 -2.598s-4.144 -.536 -6 0c-1.856 .536 -3 1.526 -3 2.598 M3 6v10c0 .888 .772 1.45 2 2 M3 11c0 .888 .772 1.45 2 2",
  "IconColorSwatch": "M19 3h-4a2 2 0 0 0 -2 2v12a4 4 0 0 0 8 0v-12a2 2 0 0 0 -2 -2 M13 7.35l-2 -2a2 2 0 0 0 -2.828 0l-2.828 2.828a2 2 0 0 0 0 2.828l9 9 M7.3 13h-2.3a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h12 M17 17l0 .01",
  "IconCompass": "M8 16l2 -6l6 -2l-2 6l-6 2 M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 3l0 2 M12 19l0 2 M3 12l2 0 M19 12l2 0",
  "IconCpu": "M5 6a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -12 M9 9h6v6h-6l0 -6 M3 10h2 M3 14h2 M10 3v2 M14 3v2 M21 10h-2 M21 14h-2 M14 21v-2 M10 21v-2",
  "IconCreditCard": "M3 8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -8 M3 10l18 0 M7 15l.01 0 M11 15l2 0",
  "IconCrown": "M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4l4 -6",
  "IconCurrencyDollar": "M16.7 8a3 3 0 0 0 -2.7 -2h-4a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-4a3 3 0 0 1 -2.7 -2 M12 3v3m0 12v3",
  "IconDatabase": "M4 6a8 3 0 1 0 16 0a8 3 0 1 0 -16 0 M4 6v6a8 3 0 0 0 16 0v-6 M4 12v6a8 3 0 0 0 16 0v-6",
  "IconDeviceDesktop": "M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10 M7 20h10 M9 16v4 M15 16v4",
  "IconDeviceFloppy": "M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2 M10 14a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M14 4l0 4l-6 0l0 -4",
  "IconDeviceGamepad2": "M12 5h3.5a5 5 0 0 1 0 10h-5.5l-4.015 4.227a2.3 2.3 0 0 1 -3.923 -2.035l1.634 -8.173a5 5 0 0 1 4.904 -4.019h3.4 M14 15l4.07 4.284a2.3 2.3 0 0 0 3.925 -2.023l-1.6 -8.232 M8 9v2 M7 10h2 M14 10h2",
  "IconDeviceMobile": "M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14 M11 4h2 M12 17v.01",
  "IconDeviceTv": "M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -9 M16 3l-4 4l-4 -4",
  "IconDice": "M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14 M8 8.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0 M15 8.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0 M15 15.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0 M8 15.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0",
  "IconDisc": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M7 12a5 5 0 0 1 5 -5 M12 17a5 5 0 0 0 5 -5",
  "IconDoorEnter": "M13 12v.01 M3 21h18 M5 21v-16a2 2 0 0 1 2 -2h6m4 10.5v7.5 M21 7h-7m3 -3l-3 3l3 3",
  "IconDroplet": "M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546",
  "IconEdit": "M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1 M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415 M16 5l3 3",
  "IconEyeOff": "M10.585 10.587a2 2 0 0 0 2.829 2.828 M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87 M3 3l18 18",
  "IconFileCertificate": "M14 3v4a1 1 0 0 0 1 1h4 M5 8v-3a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-5 M3 14a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M4.5 17l-1.5 5l3 -1.5l3 1.5l-1.5 -5",
  "IconFileCode": "M14 3v4a1 1 0 0 0 1 1h4 M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2 M10 13l-1 2l1 2 M14 13l1 2l-1 2",
  "IconFileDescription": "M14 3v4a1 1 0 0 0 1 1h4 M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2 M9 17h6 M9 13h6",
  "IconFileText": "M14 3v4a1 1 0 0 0 1 1h4 M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2 M9 9l1 0 M9 13l6 0 M9 17l6 0",
  "IconFileZip": "M6 20.735a2 2 0 0 1 -1 -1.735v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1 M11 17a2 2 0 0 1 2 2v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-2a2 2 0 0 1 2 -2 M11 5l-1 0 M13 7l-1 0 M11 9l-1 0 M13 11l-1 0 M11 13l-1 0 M13 15l-1 0",
  "IconFilter": "M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227",
  "IconFish": "M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571 M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504 M18 11v.01 M11.5 10.5c-.667 1 -.667 2 0 3",
  "IconFlame": "M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235",
  "IconFolder": "M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2",
  "IconFolderPlus": "M12 19h-7a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v3.5 M16 19h6 M19 16v6",
  "IconFolders": "M9 3h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2 M17 16v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h2",
  "IconForms": "M12 3a3 3 0 0 0 -3 3v12a3 3 0 0 0 3 3 M6 3a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3 M13 7h7a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-7 M5 7h-1a1 1 0 0 0 -1 1v8a1 1 0 0 0 1 1h1 M17 12h.01 M13 12h.01",
  "IconGavel": "M13 10l7.383 7.418c.823 .82 .823 2.148 0 2.967a2.11 2.11 0 0 1 -2.976 0l-7.407 -7.385 M6 9l4 4 M13 10l-4 -4 M3 21h7 M6.793 15.793l-3.586 -3.586a1 1 0 0 1 0 -1.414l2.293 -2.293l.5 .5l3 -3l-.5 -.5l2.293 -2.293a1 1 0 0 1 1.414 0l3.586 3.586a1 1 0 0 1 0 1.414l-2.293 2.293l-.5 -.5l-3 3l.5 .5l-2.293 2.293a1 1 0 0 1 -1.414 0",
  "IconGift": "M3 9a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -2 M12 8l0 13 M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7 M7.5 8a2.5 2.5 0 0 1 0 -5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5 -5a2.5 2.5 0 0 1 0 5",
  "IconGitCommit": "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 3l0 6 M12 15l0 6",
  "IconGlobe": "M7 9a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M5.75 15a8.015 8.015 0 1 0 9.25 -13 M11 17v4 M7 21h8",
  "IconGripVertical": "M8 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M8 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M8 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M14 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M14 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M14 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
  "IconH1": "M19 18v-8l-2 2 M4 6v12 M12 6v12 M11 18h2 M3 18h2 M4 12h8 M3 6h2 M11 6h2",
  "IconH2": "M17 12a2 2 0 1 1 4 0c0 .591 -.417 1.318 -.816 1.858l-3.184 4.143l4 0 M4 6v12 M12 6v12 M11 18h2 M3 18h2 M4 12h8 M3 6h2 M11 6h2",
  "IconH3": "M19 14a2 2 0 1 0 -2 -2 M17 16a2 2 0 1 0 2 -2 M4 6v12 M12 6v12 M11 18h2 M3 18h2 M4 12h8 M3 6h2 M11 6h2",
  "IconHash": "M5 9l14 0 M5 15l14 0 M11 4l-4 16 M17 4l-4 16",
  "IconHeading": "M7 12h10 M7 5v14 M17 5v14 M15 19h4 M15 5h4 M5 19h4 M5 5h4",
  "IconHeadphones": "M4 15a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2l0 -3 M15 15a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2l0 -3 M4 15v-3a8 8 0 0 1 16 0v3",
  "IconHeartHandshake": "M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572 M12 6l-3.293 3.293a1 1 0 0 0 0 1.414l.543 .543c.69 .69 1.81 .69 2.5 0l1 -1a3.182 3.182 0 0 1 4.5 0l2.25 2.25 M12.5 15.5l2 2 M15 13l2 2",
  "IconHelpCircle": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M12 16v.01 M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483",
  "IconHistory": "M12 8l0 4l2 2 M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5",
  "IconHome": "M5 12l-2 0l9 -9l9 9l-2 0 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7 M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6",
  "IconId": "M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -10 M7 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M15 8l2 0 M15 12l2 0 M7 16l10 0",
  "IconIdBadge2": "M7 12h3v4h-3l0 -4 M10 6h-6a1 1 0 0 0 -1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1 -1v-12a1 1 0 0 0 -1 -1h-6 M10 4a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -3 M14 16h2 M14 12h4",
  "IconInbox": "M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12 M4 13h3l3 3h4l3 -3h3",
  "IconItalic": "M11 5l6 0 M7 19l6 0 M14 5l-4 14",
  "IconKey": "M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0 M15 9h.01",
  "IconLayersLinked": "M19 8.268a2 2 0 0 1 1 1.732v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h3 M5 15.734a2 2 0 0 1 -1 -1.734v-8a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-3",
  "IconLayersSubtract": "M8 6a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -8 M16 16v2a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h2",
  "IconLayout": "M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z M4 9h16 M9 4v16",
  "IconLayoutDashboard": "M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1 M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1 M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1 M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",
  "IconLayoutGrid": "M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4 M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4 M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4 M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
  "IconLayoutNavbar": "M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12 M4 9l16 0",
  "IconLayoutSidebar": "M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12 M9 4l0 16",
  "IconLayoutSidebarLeftCollapse": "M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12 M9 4v16 M15 10l-2 2l2 2",
  "IconLayoutSidebarLeftExpand": "M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12 M9 4v16 M14 10l2 2l-2 2",
  "IconLink": "M9 15l6 -6 M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464 M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463",
  "IconList": "M9 6l11 0 M9 12l11 0 M9 18l11 0 M5 6l0 .01 M5 12l0 .01 M5 18l0 .01",
  "IconListCheck": "M3.5 5.5l1.5 1.5l2.5 -2.5 M3.5 11.5l1.5 1.5l2.5 -2.5 M3.5 17.5l1.5 1.5l2.5 -2.5 M11 6l9 0 M11 12l9 0 M11 18l9 0",
  "IconListDetails": "M13 5h8 M13 9h5 M13 15h8 M13 19h5 M3 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4 M3 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4",
  "IconListNumbers": "M11 6h9 M11 12h9 M12 18h8 M4 16a2 2 0 1 1 4 0c0 .591 -.5 1 -1 1.5l-3 2.5h4 M6 10v-6l-2 2",
  "IconLock": "M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6 M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0 M8 11v-4a4 4 0 1 1 8 0v4",
  "IconLockCheck": "M11.5 21h-4.5a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v.5 M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0 M8 11v-4a4 4 0 1 1 8 0v4 M15 19l2 2l4 -4",
  "IconLockOpen": "M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -6 M11 16a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M8 11v-5a4 4 0 0 1 8 0",
  "IconLogout": "M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2 M9 12h12l-3 -3 M18 15l3 -3",
  "IconMail": "M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10 M3 7l9 6l9 -6",
  "IconMaximize": "M4 8v-2a2 2 0 0 1 2 -2h2 M4 16v2a2 2 0 0 0 2 2h2 M16 4h2a2 2 0 0 1 2 2v2 M16 20h2a2 2 0 0 0 2 -2v-2",
  "IconMenu2": "M4 6l16 0 M4 12l16 0 M4 18l16 0",
  "IconMessage2": "M8 9h8 M8 13h6 M9 18h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-3l-3 3l-3 -3",
  "IconMessageCircle": "M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1",
  "IconMessageDots": "M12 11v.01 M8 11v.01 M16 11v.01 M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3l12 0",
  "IconMessages": "M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10 M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2",
  "IconMicrophone": "M9 5a3 3 0 0 1 3 -3a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3a3 3 0 0 1 -3 -3l0 -5 M5 10a7 7 0 0 0 14 0 M8 21l8 0 M12 17l0 4",
  "IconMoodSmile": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M9 10l.01 0 M15 10l.01 0 M9.5 15a3.5 3.5 0 0 0 5 0",
  "IconMoon": "M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008",
  "IconMouse": "M6 7a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4l0 -10 M12 7l0 4",
  "IconMusic": "M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0 M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0 M9 17v-13h10v13 M9 8h10",
  "IconPalette": "M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25 M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
  "IconPencil": "M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4 M13.5 6.5l4 4",
  "IconPhoto": "M15 8h.01 M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12 M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5 M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3",
  "IconPin": "M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4 M9 15l-4.5 4.5 M14.5 4l5.5 5.5",
  "IconPlayerPause": "M6 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12 M14 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12",
  "IconPlayerPlay": "M7 4v16l13 -8l-13 -8",
  "IconPlayerStop": "M5 7a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -10",
  "IconPlayerTrackNext": "M3 5v14l8 -7l-8 -7 M14 5v14l8 -7l-8 -7",
  "IconPlaylist": "M11 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M17 17v-13h4 M13 5h-10 M3 9l10 0 M9 13h-6",
  "IconPlug": "M9.785 6l8.215 8.215l-2.054 2.054a5.81 5.81 0 1 1 -8.215 -8.215l2.054 -2.054 M4 20l3.5 -3.5 M15 4l-3.5 3.5 M20 9l-3.5 3.5",
  "IconPlus": "M12 5l0 14 M5 12l14 0",
  "IconPlusEqual": "M4 7h6 M7 4v6 M20 16h-6 M20 19h-6 M5 19l14 -14",
  "IconPower": "M7 6a7.75 7.75 0 1 0 10 0 M12 4l0 8",
  "IconQuestionMark": "M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4 M12 19l0 .01",
  "IconQuote": "M10 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5 M19 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5",
  "IconQrcode": "M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M7 17l0 .01 M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M7 7l0 .01 M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M17 7l0 .01 M14 14l3 0 M20 14l0 .01 M14 14l0 3 M14 20l3 0 M17 17l3 0 M20 17l0 3",
  "IconRadioactive": "M13.5 14.6l3 5.19a9 9 0 0 0 4.5 -7.79h-6a3 3 0 0 1 -1.5 2.6 M13.5 9.4l3 -5.19a9 9 0 0 0 -9 0l3 5.19a3 3 0 0 1 3 0 M10.5 14.6l-3 5.19a9 9 0 0 1 -4.5 -7.79h6a3 3 0 0 0 1.5 2.6",
  "IconReceipt": "M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2",
  "IconRepeat": "M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3 M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3",
  "IconRobot": "M6 6a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -4 M12 2v2 M9 12v9 M15 12v9 M5 16l4 -2 M15 14l4 2 M9 18h6 M10 8v.01 M14 8v.01",
  "IconRocket": "M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3 M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3 M14 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
  "IconRotateClockwise": "M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5",
  "IconScale": "M7 20l10 0 M6 6l6 -1l6 1 M12 3l0 17 M9 12l-3 -6l-3 6a3 3 0 0 0 6 0 M21 12l-3 -6l-3 6a3 3 0 0 0 6 0",
  "IconSend": "M10 14l11 -11 M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5",
  "IconSeparator": "M3 12l0 .01 M7 12l10 0 M21 12l0 .01",
  "IconServer": "M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-2 M3 15a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -2 M7 8l0 .01 M7 16l0 .01",
  "IconShare": "M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M8.7 10.7l6.6 -3.4 M8.7 13.3l6.6 3.4",
  "IconShieldCheck": "M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06 M15 19l2 2l4 -4",
  "IconShoppingCart": "M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M17 17h-11v-14h-2 M6 5l14 1l-1 7h-13",
  "IconSquare": "M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14",
  "IconSquareCheckFilled": "M18.333 2c1.96 0 3.56 1.537 3.662 3.472l.005 .195v12.666c0 1.96 -1.537 3.56 -3.472 3.662l-.195 .005h-12.666a3.667 3.667 0 0 1 -3.662 -3.472l-.005 -.195v-12.666c0 -1.96 1.537 -3.56 3.472 -3.662l.195 -.005h12.666zm-2.626 7.293a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z",
  "IconStrikethrough": "M5 12l14 0 M16 6.5a4 2 0 0 0 -4 -1.5h-1a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-1.5a4 2 0 0 1 -4 -1.5",
  "IconSun": "M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7",
  "IconSwords": "M21 3v5l-11 9l-4 4l-3 -3l4 -4l9 -11l5 0 M5 13l6 6 M14.32 17.32l3.68 3.68l3 -3l-3.365 -3.365 M10 5.5l-2 -2.5h-5v5l3 2.5",
  "IconTag": "M6.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3",
  "IconTerminal2": "M8 9l3 3l-3 3 M13 15l3 0 M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -12",
  "IconThumbUp": "M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3",
  "IconTicket": "M15 5l0 2 M15 11l0 2 M15 17l0 2 M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2",
  "IconTools": "M3 21h4l13 -13a1.5 1.5 0 0 0 -4 -4l-13 13v4 M14.5 5.5l4 4 M12 8l-5 -5l-4 4l5 5 M7 8l-1.5 1.5 M16 12l5 5l-4 4l-5 -5 M16 17l-1.5 1.5",
  "IconTrash": "M4 7l16 0 M10 11l0 6 M14 11l0 6 M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12 M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3",
  "IconTrees": "M16 5l3 3l-2 1l4 4l-3 1l4 4h-9 M15 21l0 -3 M8 13l-2 -2 M8 12l2 -2 M8 21v-13 M5.824 16a3 3 0 0 1 -2.743 -3.69a3 3 0 0 1 .304 -4.833a3 3 0 0 1 4.615 -3.707a3 3 0 0 1 4.614 3.707a3 3 0 0 1 .305 4.833a3 3 0 0 1 -2.919 3.695h-4l-.176 -.005",
  "IconTrendingUp": "M3 17l6 -6l4 4l8 -8 M14 7l7 0l0 7",
  "IconTrophy": "M8 21l8 0 M12 17l0 4 M7 4l10 0 M17 4v8a5 5 0 0 1 -10 0v-8 M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
  "IconUnderline": "M7 5v5a5 5 0 0 0 10 0v-5 M5 19h14",
  "IconUser": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2",
  "IconUserCheck": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M6 21v-2a4 4 0 0 1 4 -4h4 M15 19l2 2l4 -4",
  "IconUserExclamation": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M6 21v-2a4 4 0 0 1 4 -4h4c.348 0 .686 .045 1.008 .128 M19 16v3 M19 22v.01",
  "IconUserMinus": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M6 21v-2a4 4 0 0 1 4 -4h4c.348 0 .686 .045 1.009 .128 M16 19h6",
  "IconUserPlus": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M16 19h6 M19 16v6 M6 21v-2a4 4 0 0 1 4 -4h4",
  "IconUserX": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M6 21v-2a4 4 0 0 1 4 -4h3.5 M22 22l-5 -5 M17 22l5 -5",
  "IconUsers": "M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2 M16 3.13a4 4 0 0 1 0 7.75 M21 21v-2a4 4 0 0 0 -3 -3.85",
  "IconVideo": "M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4 M3 8a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -8",
  "IconVolume": "M15 8a5 5 0 0 1 0 8 M17.7 5a9 9 0 0 1 0 14 M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5",
  "IconVolume2": "M15 8a5 5 0 0 1 0 8 M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5",
  "IconVolumeOff": "M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464 M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615 M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664 M3 3l18 18",
  "IconWand": "M6 21l15 -15l-3 -3l-15 15l3 3 M15 6l3 3 M9 3a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2 M19 13a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2",
  "IconWebhook": "M4.876 13.61a4 4 0 1 0 6.124 3.39h6 M15.066 20.502a4 4 0 1 0 1.934 -7.502c-.706 0 -1.424 .179 -2 .5l-3 -5.5 M16 8a4 4 0 1 0 -8 0c0 1.506 .77 2.818 2 3.5l-3 5.5",
  "IconWifi": "M12 18l.01 0 M9.172 15.172a4 4 0 0 1 5.656 0 M6.343 12.343a8 8 0 0 1 11.314 0 M3.515 9.515c4.686 -4.687 12.284 -4.687 17 0",
  "IconWifiOff": "M12 18l.01 0 M9.172 15.172a4 4 0 0 1 5.656 0 M6.343 12.343a7.963 7.963 0 0 1 3.864 -2.14m4.163 .155a7.965 7.965 0 0 1 3.287 2 M3.515 9.515a12 12 0 0 1 3.544 -2.455m3.101 -.92a12 12 0 0 1 10.325 3.374 M3 3l18 18",
  "IconWorld": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M3.6 9h16.8 M3.6 15h16.8 M11.5 3a17 17 0 0 0 0 18 M12.5 3a17 17 0 0 1 0 18",
  "IconWriting": "M20 17v-12c0 -1.121 -.879 -2 -2 -2s-2 .879 -2 2v12l2 2l2 -2 M16 7h4 M18 19h-13a2 2 0 1 1 0 -4h4a2 2 0 1 0 0 -4h-3",
  "IconAppWindow": "M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14 M6 8h.01 M9 8h.01",
  "IconLayoutSidebarRight": "M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z M15 4l0 16",
  "IconMessage": "M8 9h8 M8 13h6 M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z",
  "IconZoomIn": "M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-6 -6 M10 7v6 M7 10h6",
  "IconZoomOut": "M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-6 -6 M7 10h6"
};

function createIcon(name: string) {
  const d = PATHS[name];
  const isFilled = name.endsWith('Filled');

  const comp = React.forwardRef<SVGSVGElement, any>(function TablerIcon(
    { size = 20, color = 'currentColor', stroke = 2, className = '', ...props },
    ref
  ) {
    return React.createElement(
      'svg',
      {
        ref,
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: isFilled ? color : 'none',
        stroke: isFilled ? 'none' : color,
        strokeWidth: stroke,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        ...props
      },
      d
        ? React.createElement('path', { d })
        : [
            React.createElement('circle', { key: 'c', cx: 12, cy: 12, r: 9 }),
            React.createElement('path', { key: 'p', d: 'M9 12l2 2l4 -4' })
          ]
    );
  });
  comp.displayName = name;
  return comp;
}

export const IconActivity = createIcon('IconActivity');
export const IconAdjustments = createIcon('IconAdjustments');
export const IconAlertCircle = createIcon('IconAlertCircle');
export const IconAlertTriangle = createIcon('IconAlertTriangle');
export const IconArrowDown = createIcon('IconArrowDown');
export const IconArrowLeft = createIcon('IconArrowLeft');
export const IconArrowRight = createIcon('IconArrowRight');
export const IconArrowUp = createIcon('IconArrowUp');
export const IconArrowUpRight = createIcon('IconArrowUpRight');
export const IconArrowsShuffle = createIcon('IconArrowsShuffle');
export const IconBell = createIcon('IconBell');
export const IconBellOff = createIcon('IconBellOff');
export const IconBolt = createIcon('IconBolt');
export const IconBook = createIcon('IconBook');
export const IconBorderRadius = createIcon('IconBorderRadius');
export const IconBox = createIcon('IconBox');
export const IconBrandDiscord = createIcon('IconBrandDiscord');
export const IconBrandGithub = createIcon('IconBrandGithub');
export const IconBrandX = createIcon('IconBrandX');
export const IconBroadcast = createIcon('IconBroadcast');
export const IconBug = createIcon('IconBug');
export const IconBuildingCommunity = createIcon('IconBuildingCommunity');
export const IconCake = createIcon('IconCake');
export const IconCheck = createIcon('IconCheck');
export const IconChecks = createIcon('IconChecks');
export const IconChevronDown = createIcon('IconChevronDown');
export const IconChevronLeft = createIcon('IconChevronLeft');
export const IconChevronRight = createIcon('IconChevronRight');
export const IconChevronUp = createIcon('IconChevronUp');
export const IconCircleCheckFilled = createIcon('IconCircleCheckFilled');
export const IconCircleCheck = createIcon('IconCircleCheckFilled');
export const IconClock = createIcon('IconClock');
export const IconCode = createIcon('IconCode');
export const IconCoin = createIcon('IconCoin');
export const IconCoins = createIcon('IconCoins');
export const IconCopy = createIcon('IconCopy');
export const IconCpu = createIcon('IconCpu');
export const IconCreditCard = createIcon('IconCreditCard');
export const IconCrown = createIcon('IconCrown');
export const IconDatabase = createIcon('IconDatabase');
export const IconDeviceFloppy = createIcon('IconDeviceFloppy');
export const IconDeviceGamepad2 = createIcon('IconDeviceGamepad2');
export const IconDownload = createIcon('IconDownload');
export const IconEdit = createIcon('IconEdit');
export const IconExternalLink = createIcon('IconExternalLink');
export const IconEye = createIcon('IconEye');
export const IconFileCertificate = createIcon('IconFileCertificate');
export const IconFileCode = createIcon('IconFileCode');
export const IconFileText = createIcon('IconFileText');
export const IconFileZip = createIcon('IconFileZip');
export const IconFlame = createIcon('IconFlame');
export const IconFolder = createIcon('IconFolder');
export const IconGavel = createIcon('IconGavel');
export const IconGift = createIcon('IconGift');
export const IconGitCommit = createIcon('IconGitCommit');
export const IconGripVertical = createIcon('IconGripVertical');
export const IconHash = createIcon('IconHash');
export const IconHeart = createIcon('IconHeart');
export const IconHelpCircle = createIcon('IconHelpCircle');
export const IconHistory = createIcon('IconHistory');
export const IconHome = createIcon('IconHome');
export const IconInfoCircle = createIcon('IconInfoCircle');
export const IconLayersLinked = createIcon('IconLayersLinked');
export const IconLayers = createIcon('IconLayersLinked');
export const IconLayout = createIcon('IconLayout');
export const IconLayoutDashboard = createIcon('IconLayoutDashboard');
export const IconLayoutSidebar = createIcon('IconLayoutSidebar');
export const IconLayoutSidebarLeftCollapse = createIcon('IconLayoutSidebarLeftCollapse');
export const IconLayoutSidebarLeftExpand = createIcon('IconLayoutSidebarLeftExpand');
export const IconLink = createIcon('IconLink');
export const IconListCheck = createIcon('IconListCheck');
export const IconLock = createIcon('IconLock');
export const IconLockCheck = createIcon('IconLockCheck');
export const IconLogout = createIcon('IconLogout');
export const IconMenu2 = createIcon('IconMenu2');
export const IconMessage2 = createIcon('IconMessage2');
export const IconMessageCircle = createIcon('IconMessageCircle');
export const IconMessageDots = createIcon('IconMessageDots');
export const IconMoodSmile = createIcon('IconMoodSmile');
export const IconMoon = createIcon('IconMoon');
export const IconMusic = createIcon('IconMusic');
export const IconPackage = createIcon('IconPackage');
export const IconPalette = createIcon('IconPalette');
export const IconPhoto = createIcon('IconPhoto');
export const IconPlayerPause = createIcon('IconPlayerPause');
export const IconPlayerPlay = createIcon('IconPlayerPlay');
export const IconPlug = createIcon('IconPlug');
export const IconPlus = createIcon('IconPlus');
export const IconPower = createIcon('IconPower');
export const IconQuestionMark = createIcon('IconQuestionMark');
export const IconRefresh = createIcon('IconRefresh');
export const IconReload = createIcon('IconReload');
export const IconRobot = createIcon('IconRobot');
export const IconRocket = createIcon('IconRocket');
export const IconRotateClockwise = createIcon('IconRotateClockwise');
export const IconScale = createIcon('IconScale');
export const IconSearch = createIcon('IconSearch');
export const IconSend = createIcon('IconSend');
export const IconServer = createIcon('IconServer');
export const IconSettings = createIcon('IconSettings');
export const IconShield = createIcon('IconShield');
export const IconShieldCheck = createIcon('IconShieldCheck');
export const IconShieldLock = createIcon('IconShieldLock');
export const IconShoppingBag = createIcon('IconShoppingBag');
export const IconSparkles = createIcon('IconSparkles');
export const IconStar = createIcon('IconStar');
export const IconStarFilled = createIcon('IconStarFilled');
export const IconSun = createIcon('IconSun');
export const IconTag = createIcon('IconTag');
export const IconTerminal2 = createIcon('IconTerminal2');
export const IconThumbUp = createIcon('IconThumbUp');
export const IconTicket = createIcon('IconTicket');
export const IconTools = createIcon('IconTools');
export const IconTrash = createIcon('IconTrash');
export const IconTrophy = createIcon('IconTrophy');
export const IconUpload = createIcon('IconUpload');
export const IconUser = createIcon('IconUser');
export const IconUserCheck = createIcon('IconUserCheck');
export const IconUserPlus = createIcon('IconUserPlus');
export const IconUserX = createIcon('IconUserX');
export const IconUsers = createIcon('IconUsers');
export const IconVolume = createIcon('IconVolume');
export const IconVolumeOff = createIcon('IconVolumeOff');
export const IconWebhook = createIcon('IconWebhook');
export const IconWifi = createIcon('IconWifi');
export const IconWriting = createIcon('IconWriting');
export const IconX = createIcon('IconX');

export const IconAlignCenter = createIcon('IconAlignCenter');
export const IconAlignLeft = createIcon('IconAlignLeft');
export const IconAlignRight = createIcon('IconAlignRight');
export const IconArrowsExchange = createIcon('IconArrowsExchange');
export const IconAt = createIcon('IconAt');
export const IconBan = createIcon('IconBan');
export const IconBold = createIcon('IconBold');
export const IconBraces = createIcon('IconBraces');
export const IconBrandAndroid = createIcon('IconBrandAndroid');
export const IconBrandApple = createIcon('IconBrandApple');
export const IconBrandPaypal = createIcon('IconBrandPaypal');
export const IconBrandSoundcloud = createIcon('IconBrandSoundcloud');
export const IconBrandSpotify = createIcon('IconBrandSpotify');
export const IconBrandStripe = createIcon('IconBrandStripe');
export const IconBrandTelegram = createIcon('IconBrandTelegram');
export const IconBrandTwitter = createIcon('IconBrandTwitter');
export const IconBrandWindows = createIcon('IconBrandWindows');
export const IconBrandYoutube = createIcon('IconBrandYoutube');
export const IconBulb = createIcon('IconBulb');
export const IconCalendar = createIcon('IconCalendar');
export const IconCalendarTime = createIcon('IconCalendarTime');
export const IconChartBar = createIcon('IconChartBar');
export const IconCheckbox = createIcon('IconCheckbox');
export const IconChecklist = createIcon('IconChecklist');
export const IconCloudUpload = createIcon('IconCloudUpload');
export const IconColorSwatch = createIcon('IconColorSwatch');
export const IconCompass = createIcon('IconCompass');
export const IconCurrencyDollar = createIcon('IconCurrencyDollar');
export const IconDeviceDesktop = createIcon('IconDeviceDesktop');
export const IconDeviceMobile = createIcon('IconDeviceMobile');
export const IconDeviceTv = createIcon('IconDeviceTv');
export const IconDice = createIcon('IconDice');
export const IconDisc = createIcon('IconDisc');
export const IconDoorEnter = createIcon('IconDoorEnter');
export const IconDroplet = createIcon('IconDroplet');
export const IconEyeOff = createIcon('IconEyeOff');
export const IconFileDescription = createIcon('IconFileDescription');
export const IconFilter = createIcon('IconFilter');
export const IconFish = createIcon('IconFish');
export const IconFolderPlus = createIcon('IconFolderPlus');
export const IconFolders = createIcon('IconFolders');
export const IconForms = createIcon('IconForms');
export const IconGlobe = createIcon('IconGlobe');
export const IconH1 = createIcon('IconH1');
export const IconH2 = createIcon('IconH2');
export const IconH3 = createIcon('IconH3');
export const IconHeading = createIcon('IconHeading');
export const IconHeadphones = createIcon('IconHeadphones');
export const IconHeartHandshake = createIcon('IconHeartHandshake');
export const IconId = createIcon('IconId');
export const IconIdBadge2 = createIcon('IconIdBadge2');
export const IconInbox = createIcon('IconInbox');
export const IconItalic = createIcon('IconItalic');
export const IconKey = createIcon('IconKey');
export const IconLayersSubtract = createIcon('IconLayersSubtract');
export const IconLayoutGrid = createIcon('IconLayoutGrid');
export const IconLayoutNavbar = createIcon('IconLayoutNavbar');
export const IconList = createIcon('IconList');
export const IconListDetails = createIcon('IconListDetails');
export const IconListNumbers = createIcon('IconListNumbers');
export const IconLockOpen = createIcon('IconLockOpen');
export const IconMail = createIcon('IconMail');
export const IconMaximize = createIcon('IconMaximize');
export const IconMessages = createIcon('IconMessages');
export const IconMicrophone = createIcon('IconMicrophone');
export const IconMouse = createIcon('IconMouse');
export const IconPencil = createIcon('IconPencil');
export const IconPin = createIcon('IconPin');
export const IconPlayerStop = createIcon('IconPlayerStop');
export const IconPlayerTrackNext = createIcon('IconPlayerTrackNext');
export const IconPlaylist = createIcon('IconPlaylist');
export const IconPlusEqual = createIcon('IconPlusEqual');
export const IconQuote = createIcon('IconQuote');
export const IconQrcode = createIcon('IconQrcode');
export const IconRadioactive = createIcon('IconRadioactive');
export const IconReceipt = createIcon('IconReceipt');
export const IconRepeat = createIcon('IconRepeat');
export const IconSeparator = createIcon('IconSeparator');
export const IconShare = createIcon('IconShare');
export const IconShoppingCart = createIcon('IconShoppingCart');
export const IconSquare = createIcon('IconSquare');
export const IconSquareCheckFilled = createIcon('IconSquareCheckFilled');
export const IconStrikethrough = createIcon('IconStrikethrough');
export const IconSwords = createIcon('IconSwords');
export const IconTrees = createIcon('IconTrees');
export const IconTrendingUp = createIcon('IconTrendingUp');
export const IconUnderline = createIcon('IconUnderline');
export const IconUserExclamation = createIcon('IconUserExclamation');
export const IconUserMinus = createIcon('IconUserMinus');
export const IconVideo = createIcon('IconVideo');
export const IconVolume2 = createIcon('IconVolume2');
export const IconWand = createIcon('IconWand');
export const IconWifiOff = createIcon('IconWifiOff');
export const IconWorld = createIcon('IconWorld');
export const IconAppWindow = createIcon('IconAppWindow');
export const IconLayoutSidebarRight = createIcon('IconLayoutSidebarRight');
export const IconMessage = createIcon('IconMessage');
export const IconZoomIn = createIcon('IconZoomIn');
export const IconZoomOut = createIcon('IconZoomOut');
export const IconDiamond = createIcon('IconDiamond');

const proxy = new Proxy({}, {
  get: (_, prop) => createIcon(String(prop))
});

export default proxy;
