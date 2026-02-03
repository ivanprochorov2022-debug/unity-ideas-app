
export const UNITY_KEYWORDS = [
  'MonoBehaviour', 'GameObject', 'Transform', 'Rigidbody', 'Rigidbody2D', 
  'Collider', 'BoxCollider', 'SphereCollider', 'Animator', 'AudioSource', 
  'Camera', 'Light', 'NavMeshAgent', 'Canvas', 'Image', 'Text', 
  'Button', 'Input', 'Time', 'Mathf', 'Vector3', 'Vector2', 'Quaternion',
  'Coroutine', 'IEnumerator', 'UnityEvent', 'SerializeField', 'Start', 'Update',
  'Awake', 'OnCollisionEnter', 'OnTriggerEnter', 'Destroy', 'Instantiate'
];

export const linkifyUnityDocs = (text: string): string => {
  // Simple regex to replace keywords with markdown links if they aren't already links
  // This is a basic implementation.
  let newText = text;
  
  UNITY_KEYWORDS.forEach(keyword => {
    // Regex matches the keyword not preceded by '[' (to avoid existing links) 
    // and ensuring word boundaries
    const regex = new RegExp(`(?<!\\[)\\b${keyword}\\b`, 'g');
    newText = newText.replace(regex, `[${keyword}](https://docs.unity3d.com/ScriptReference/Search.html?q=${keyword})`);
  });
  
  return newText;
};
